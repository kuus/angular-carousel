(function() {
    "use strict";

    angular.module('angular-carousel')

    .directive('rnCarousel', ['$swipe', '$window', '$document', '$parse', '$compile', '$rootScope', function($swipe, $window, $document, $parse, $compile, $rootScope) {
        // internal ids to allow multiple instances
        var carouselId = 0,
            // used to compute the sliding speed
            timeConstant = 75,
            // in container % how much we need to drag to trigger the slide change
            moveTreshold = 0.05,
            // in absolute pixels, at which distance the slide stick to the edge on release
            rubberTreshold = 3,
            // use raf.js, a requestAnimationFrame polyfill, to make this work on IE9
            requestAnimationFrame = $window.requestAnimationFrame || $window.webkitRequestAnimationFrame || $window.mozRequestAnimationFrame;

        return {
            restrict: 'A',
            scope: true,
            compile: function(tElement, tAttributes) {
                // use the compile phase to customize the DOM
                var firstChildAttributes = tElement.children()[0].attributes,
                    isRepeatBased = false,
                    isBuffered = false,
                    slidesCount = 0,
                    isIndexBound = false,
                    repeatItem,
                    repeatCollection,
                    showNextAttribute = tAttributes.rnShowNext,
                    showNextSlideMode = false,
                    percentageNextSlideToShow = 0,
                    isVertical = false,
                    verticalClass = '',
                    dirProperty = 'width',
                    dirAxis = 'x',
                    tElementSlides = tElement.children();
                // change direction if attribute is set
                if(tElement.rnCarousel === 'vertical') {
                    isVertical = true;
                    dirProperty = 'height';
                    dirAxis = 'y';
                    verticalClass = ' rn-carousel-vertical';
                }
                // showNextSlideMode
                if(angular.isDefined(showNextAttribute)) {
                    showNextSlideMode = true;
                    percentageNextSlideToShow = isNaN(showNextAttribute) ? 90 : 100 - showNextAttribute;
                    // set width on slides
                    angular.forEach(tElementSlides, function(element) {
                        element.style.width = percentageNextSlideToShow + '%';
                    });
                }

                // add CSS classes
                tElement.addClass('rn-carousel-slides');
                tElementSlides.addClass('rn-carousel-slide');

                // try to find an ngRepeat expression
                // at this point, the attributes are not yet normalized so we need to try various syntax
                ['ng-repeat', 'data-ng-repeat', 'x-ng-repeat'].every(function(attr) {
                    var repeatAttribute = firstChildAttributes[attr];
                    if (angular.isDefined(repeatAttribute)) {
                        // ngRepeat regexp extracted from angular 1.2.7 src
                        var exprMatch = repeatAttribute.value.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+track\s+by\s+([\s\S]+?))?\s*$/),
                            trackProperty = exprMatch[3];

                        repeatItem = exprMatch[1];
                        repeatCollection = exprMatch[2];

                        if (repeatItem) {
                            if (angular.isDefined(tAttributes['rnCarouselBuffered'])) {
                                // update the current ngRepeat expression and add a slice operator if buffered
                                isBuffered = true;
                                repeatAttribute.value = repeatItem + ' in ' + repeatCollection + '|carouselSlice:carouselBufferIndex:carouselBufferSize';
                                if (trackProperty) {
                                    repeatAttribute.value += ' track by ' + trackProperty;
                                }
                            }
                            isRepeatBased = true;
                            return false;
                        }
                    }
                    return true;
                });

                return function(scope, iElement, iAttributes, containerCtrl) {

                    carouselId++;

                    var containerSize,
                        containerSizeStep,
                        containerSizeToConsider,
                        containerOffset,
                        transformProperty,
                        pressed,
                        startAxis,
                        amplitude,
                        offset = 0,
                        destination,
                        slidesCount = 0,
                        swipeMoved = false,
                        swipeCoordsEnd = { x: 0, y: 0 },
                        swipeCoordsStart = { x: 0, y: 0 },
                        // javascript based animation easing
                        timestamp;

                    // add a wrapper div that will hide the overflow
                    var carousel = iElement.wrap('<div id="carousel-' + carouselId + '" class="rn-carousel-container' + verticalClass + '"></div>'),
                        container = carousel.parent();

                    // if indicator or controls, setup the watch
                    if (angular.isDefined(iAttributes.rnCarouselIndicator) || angular.isDefined(iAttributes.rnCarouselControl)) {
                        updateIndicatorArray();
                        scope.$watch('carouselIndex', function(newValue) {
                            scope.indicatorIndex = newValue;
                        });
                        scope.$watch('indicatorIndex', function(newValue) {
                            goToSlide(newValue, true);
                        });

                    }

                    // enable carousel indicator
                    if (angular.isDefined(iAttributes.rnCarouselIndicator)) {
                        var indicator = $compile('<div id="carousel-' + carouselId + '-indicator" index="indicatorIndex" items="carouselIndicatorArray" rn-carousel-indicators class="rn-carousel-indicator"></div>')(scope);
                        container.append(indicator);
                    }

                    // enable carousel controls
                    if (angular.isDefined(iAttributes.rnCarouselControl)) {
                        var controls = $compile('<div id="carousel-' + carouselId + '-controls" index="indicatorIndex" items="carouselIndicatorArray" rn-carousel-controls class="rn-carousel-controls"></div>')(scope);
                        container.append(controls);
                    }

                    scope.carouselBufferIndex = 0;
                    scope.carouselBufferSize = 5;
                    scope.carouselIndex = 0;

                    // handle index databinding
                    if (iAttributes.rnCarouselIndex) {
                        var updateParentIndex = function(value) {
                            indexModel.assign(scope.$parent, value);
                        };
                        var indexModel = $parse(iAttributes.rnCarouselIndex);
                        if (angular.isFunction(indexModel.assign)) {
                            /* check if this property is assignable then watch it */
                            scope.$watch('carouselIndex', function(newValue) {
                                updateParentIndex(newValue);
                            });
                            scope.carouselIndex = indexModel(scope);
                            scope.$parent.$watch(indexModel, function(newValue, oldValue) {
                                if (newValue!==undefined) {
                                    if (newValue >= slidesCount) {
                                        newValue = slidesCount - 1;
                                        updateParentIndex(newValue);
                                    } else if (newValue < 0) {
                                        newValue = 0;
                                        updateParentIndex(newValue);
                                    }
                                    goToSlide(newValue, true);
                                }
                            });
                            isIndexBound = true;
                        } else if (!isNaN(iAttributes.rnCarouselIndex)) {
                          /* if user just set an initial number, set it */
                          scope.carouselIndex = parseInt(iAttributes.rnCarouselIndex, 10);
                        }
                    }

                    // watch the given collection
                    if (isRepeatBased) {
                        scope.$watchCollection(repeatCollection, function(newValue, oldValue) {
                            slidesCount = 0;
                            if (angular.isArray(newValue)) {
                                slidesCount = newValue.length;
                            } else if (angular.isObject(newValue)) {
                                slidesCount = Object.keys(newValue).length;
                            }
                            updateIndicatorArray();
                            if (!containerSize) updateContainerWidth();
                            goToSlide(scope.carouselIndex);
                        });
                    } else {
                        slidesCount = iElement.children().length;
                        updateIndicatorArray();
                        updateContainerWidth();
                    }

                    function updateIndicatorArray() {
                        // generate an array to be used by the indicators
                        var items = [];
                        for (var i = 0; i < slidesCount; i++) items[i] = i;
                        scope.carouselIndicatorArray = items;
                    }

                    function getCarouselSize() {
                        var slides = carousel.children();
                        if (slides.length === 0 || showNextSlideMode) {
                            containerSize = carousel[0].getBoundingClientRect()[dirProperty];
                        } else {
                            containerSize = slides[0].getBoundingClientRect()[dirProperty];
                        }
                        containerSizeStep = (containerSize / 100) * percentageNextSlideToShow;
                        containerOffset = containerSize - containerSizeStep;
                        containerSizeToConsider = showNextSlideMode ? containerSizeStep : containerSize;
                        return containerSize;
                    }

                    function updateContainerWidth() {
                        // force the carousel container width to match the first slide width
                        container.css(dirProperty, '100%');
                        var size = getCarouselSize();
                        if (size) {
                            container.css(dirProperty, size + 'px');
                        }
                    }

                    function scroll(x) {
                        // use CSS 3D transform to move the carousel
                        if (isNaN(x)) {
                            x = scope.carouselIndex * containerSizeToConsider;
                        }

                        offset = x;
                        var move = -Math.round(offset);
                        move += (scope.carouselBufferIndex * containerSizeToConsider);

                        if(!is3dAvailable) {
                            if(isVertical) {
                                carousel[0].style[transformProperty] = 'translate(0, ' + move + 'px)';
                            } else {
                                carousel[0].style[transformProperty] = 'translate(' + move + 'px, 0)';
                            }
                        } else {
                            if(isVertical) {
                                carousel[0].style[transformProperty] = 'translate3d(0, ' + move + 'px, 0)';
                            } else {
                                carousel[0].style[transformProperty] = 'translate3d(' + move + 'px, 0, 0)';
                            }
                        }
                    }

                    function autoScroll() {
                        // scroll smoothly to "destination" until we reach it
                        // using requestAnimationFrame
                        var elapsed, delta;

                        if (amplitude) {
                            elapsed = Date.now() - timestamp;
                            delta = amplitude * Math.exp(-elapsed / timeConstant);

                            if (delta > rubberTreshold || delta < -rubberTreshold) {
                                if(showNextSlideMode) {
                                    scroll((destination - getIncrementalOffset(delta)) - delta);
                                } else {
                                    scroll(destination - delta);
                                }
                                /* We are using raf.js, a requestAnimationFrame polyfill, so
                                this will work on IE9 */
                                requestAnimationFrame(autoScroll);
                            } else {
                                goToSlide(destination / containerSize);
                            }
                        }
                    }

                    function capIndex(idx) {
                        // ensure given index it inside bounds
                        return (idx >= slidesCount) ? slidesCount: (idx <= 0) ? 0 : idx;
                    }

                    function updateBufferIndex() {
                        // update and cap te buffer index
                        var bufferIndex = 0;
                        var bufferEdgeSize = (scope.carouselBufferSize - 1) / 2;
                        if (isBuffered) {
                            if (scope.carouselIndex <= bufferEdgeSize) {
                                bufferIndex = 0;
                            } else if (slidesCount < scope.carouselBufferSize) {
                                bufferIndex = 0;
                            } else if (scope.carouselIndex > slidesCount - scope.carouselBufferSize) {
                                bufferIndex = slidesCount - scope.carouselBufferSize;
                            } else {
                                bufferIndex = scope.carouselIndex - bufferEdgeSize;
                            }
                        }
                        scope.carouselBufferIndex = bufferIndex;
                    }

                    function goToSlide(i, animate) {
                        if (isNaN(i)) {
                            i = scope.carouselIndex;
                        }
                        if (animate) {
                            // simulate a swipe so we have the standard animation
                            // used when external binding index is updated or touch canceed
                            offset = (i * containerSizeToConsider);
                            swipeEnd(null, null, true);
                            return;
                        }
                        scope.carouselIndex = capIndex(i);
                        updateBufferIndex();
                        // if outside of angular scope, trigger angular digest cycle
                        // use local digest only for perfs if no index bound
                        if ($rootScope.$$phase!=='$apply' && $rootScope.$$phase!=='$digest') {
                            if (isIndexBound) {
                                scope.$apply();
                            } else {
                                scope.$digest();
                            }
                        }
                        scroll();
                    }

                    function getAbsMoveTreshold() {
                        // return min pixels required to move a slide
                        return moveTreshold * containerSize;
                    }

                    function documentMouseUpEvent(event) {
                        // in case we click outside the carousel, trigger a fake swipeEnd
                        // this doesn't allow clicks inside carousel..tempfix, probably breaks something else
                        // swipeMoved = true;
                        swipeEnd({
                            x: event.clientX,
                            y: event.clientY
                        }, event);
                    }

                    function capPosition(x) {
                        // limit position if start or end of slides
                        var position = x;
                        if (scope.carouselIndex===0) {
                            position = Math.max(-getAbsMoveTreshold(), position);
                        } else if (scope.carouselIndex===slidesCount-1) {
                            position = Math.min(((slidesCount-1)*containerSize + getAbsMoveTreshold()), position);
                        }
                        return position;
                    }

                    function swipeStart(coords, event) {
                        // console.log('swipeStart', coords, event);
                        if(showNextSlideMode) {
                            swipeCoordsStart = coords;
                        }

                        // stop events from propagating to handle nested carousels
                        // this doesn't allow clicks inside carousel..tempfix, probably breaks something else
                        // if(event) {
                        //     event.stopPropagation();
                        // }

                        $document.bind('mouseup', documentMouseUpEvent);
                        pressed = true;
                        startAxis = coords[dirAxis];

                        amplitude = 0;
                        timestamp = Date.now();

                        return false;
                    }

                    function swipeMove(coords, event) {
                        //console.log('swipeMove', coords, event);
                        var axis, delta;
                        if (pressed) {
                            axis = coords[dirAxis];
                            delta = startAxis - axis;
                            if (delta > 2 || delta < -2) {
                                // stop events from propagating to handle nested carousels
                                if(event) {
                                    event.stopPropagation();
                                }

                                swipeMoved = true;
                                startAxis = axis;

                                /* We are using raf.js, a requestAnimationFrame polyfill, so
                                this will work on IE9 */
                                requestAnimationFrame(function() {
                                    scroll(capPosition(offset + delta));
                                });
                            }
                        }
                        return false;
                    }

                    function getIncrementalOffset(delta) {
                        if(delta > 0) {
                            return containerOffset * (scope.carouselIndex + 1);
                        } else {
                            return containerOffset * (scope.carouselIndex - 1);
                        }
                    }

                    function swipeEnd(coords, event, forceAnimation) {
                        // console.log('swipeEnd', 'event', event, 'scope.carouselIndex', scope.carouselIndex, 'swipeMoved', swipeMoved);

                        // Prevent clicks on buttons inside slider to trigger "swipeEnd" event on touchend/mouseup
                        if(event && !swipeMoved) {
                            return;
                        }

                        // stop events from propagating to handle nested carousels
                        if(event) {
                            event.stopPropagation();
                        }

                        // check the mode
                        if(showNextSlideMode) {
                            swipeCoordsEnd = coords;
                            // console.log('swipeCoordsEnd', swipeCoordsEnd)
                            // determine the diretion of the swipe
                            if(angular.isObject(swipeCoordsStart) && angular.isObject(swipeCoordsEnd)) {
                                var swipedDelta = (swipeCoordsStart[dirAxis] > swipeCoordsEnd[dirAxis]) ? 1 : 0;
                            } else {
                                var swipedDelta = 0;
                            }
                            var currentOffset = (scope.carouselIndex * containerSize) - getIncrementalOffset(swipedDelta);
                            // if(swipeCoordsStart[dirAxis] === swipeCoordsEnd[dirAxis]) {
                            //    return;
                            // } else {
                            //    var currentOffset = (scope.carouselIndex * containerSize) - getIncrementalOffset(swipedDelta);
                            // }
                        } else {
                            var currentOffset = scope.carouselIndex * containerSizeToConsider;
                        }
                        // console.log('swipedDelta', swipedDelta, 'scope.carouselIndex', scope.carouselIndex, 'currentOffset', currentOffset)

                        $document.unbind('mouseup', documentMouseUpEvent);
                        pressed = false;
                        swipeMoved = false;

                        destination = offset;

                        var minMove = getAbsMoveTreshold(),
                            // currentOffset = (scope.carouselIndex * containerSize),
                            absMove = currentOffset - destination,
                            slidesMove = -Math[absMove>=0?'ceil':'floor'](absMove / containerSize),
                            shouldMove = Math.abs(absMove) > minMove;

                        if ((slidesMove + scope.carouselIndex) >= slidesCount ) {
                            slidesMove = slidesCount - 1 - scope.carouselIndex;
                        }
                        if ((slidesMove + scope.carouselIndex) < 0) {
                            slidesMove = -scope.carouselIndex;
                        }
                        var moveOffset = shouldMove?slidesMove:0;

                        destination = (moveOffset + scope.carouselIndex) * containerSize;
                        amplitude = destination - offset;
                        timestamp = Date.now();
                        if (forceAnimation) {
                            amplitude = offset - currentOffset;
                        }
                        /* We are using raf.js, a requestAnimationFrame polyfill, so
                        this will work on IE9 */
                        requestAnimationFrame(autoScroll);

                        return false;
                    }

                    iAttributes.$observe('rnCarouselSwipe', function(newValue, oldValue) {
                        // only bind swipe when it's not switched off
                        if(newValue !== 'false' && newValue !== 'off') {
                            $swipe.bind(carousel, {
                                start: swipeStart,
                                move: swipeMove,
                                end: swipeEnd,
                                cancel: function(event) {
                                  swipeEnd({}, event);
                                }
                            });
                        } else {
                            // unbind swipe when it's switched off
                            carousel.unbind();
                        }
                    });

                    // initialise first slide only if no binding
                    // if so, the binding will trigger the first init
                    if (!isIndexBound) {
                        goToSlide(scope.carouselIndex);
                    }

                    // detect supported CSS property
                    transformProperty = 'transform';
                    ['webkit', 'Moz', 'O', 'ms'].every(function (prefix) {
                        var e = prefix + 'Transform';
                        if (typeof document.body.style[e] !== 'undefined') {
                            transformProperty = e;
                            return false;
                        }
                        return true;
                    });

                    //Detect support of translate3d
                    function detect3dSupport(){
                        // use modernizr if exists
                        if(angular.isDefined($window.Modernizr) && angular.isDefined($window.Modernizr.csstransforms3d)) {
                            return $window.Modernizr.csstransforms3d;
                        }
                        var el = document.createElement('p'),
                        has3d,
                        transforms = {
                            'webkitTransform':'-webkit-transform',
                            'msTransform':'-ms-transform',
                            'transform':'transform'
                        };
                        // Add it to the body to get the computed style
                        document.body.insertBefore(el, null);
                        for(var t in transforms){
                            if( el.style[t] !== undefined ){
                                el.style[t] = 'translate3d(1px,1px,1px)';
                                has3d = window.getComputedStyle(el).getPropertyValue(transforms[t]);
                            }
                        }
                        document.body.removeChild(el);
                        return (has3d !== undefined && has3d.length > 0 && has3d !== "none");
                    }

                    var is3dAvailable = detect3dSupport();

                    function onOrientationChange() {
                        updateContainerWidth();
                        goToSlide();
                    }

                    // handle orientation change
                    var winEl = angular.element($window);
                    winEl.bind('orientationchange', onOrientationChange);
                    winEl.bind('resize', onOrientationChange);

                    scope.$on('$destroy', function() {
                        $document.unbind('mouseup', documentMouseUpEvent);
                        winEl.unbind('orientationchange', onOrientationChange);
                        winEl.unbind('resize', onOrientationChange);
                    });

                };
            }
        };
    }]);

})();
