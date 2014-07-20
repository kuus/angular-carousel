'use strict';

angular.module('DemoApp', [
    'angular-carousel'
])
/*
 * Carousel factory
 *
 * a small abstraction to wrap the revolunet carousels
 * and easily manage multiple instances of it
 *
 */
.factory('CarouselRevolunet', function () {
    var Carousel = function(elements, limit, startFrom) {
        this.elements = elements;
        this.index = startFrom || 0;
        this.limit = limit;
        this.setLast(elements);
    };
    Carousel.prototype.prev = function() {
        this.index--;
    };
    Carousel.prototype.next = function() {
        this.index++;
    };
    Carousel.prototype.setLast = function(elements) {
        this.last = Math.ceil(elements.length / this.limit) - 1;
    };
    Carousel.prototype.resetIndex = function() {
        this.index = 0;
    }
    Carousel.prototype.changeElements = function(elements) {
        this.elements = elements;
        this.setLast(elements);
    };
    return Carousel;
})
/*
 * Demo Controller
 *
 */
.controller('DemoCtrl', function($scope, $timeout, CarouselRevolunet) {
    var colors = ["#fc0003", "#f70008", "#f2000d", "#ed0012", "#e80017", "#e3001c", "#de0021", "#d90026", "#d4002b", "#cf0030", "#c90036", "#c4003b", "#bf0040", "#ba0045", "#b5004a", "#b0004f", "#ab0054", "#a60059", "#a1005e", "#9c0063", "#960069", "#91006e", "#8c0073", "#870078", "#82007d", "#7d0082", "#780087", "#73008c", "#6e0091", "#690096", "#63009c", "#5e00a1", "#5900a6", "#5400ab", "#4f00b0", "#4a00b5", "#4500ba", "#4000bf", "#3b00c4", "#3600c9", "#3000cf", "#2b00d4", "#2600d9", "#2100de", "#1c00e3", "#1700e8", "#1200ed", "#0d00f2", "#0800f7", "#0300fc"];
    $scope.colors = colors;

    function addSlide(target, style, width, height) {
        var i = target.length,
            width = width || 450,
            height = height || 300;
        target.push({
            label: 'slide #' + (i + 1),
            img: 'http://lorempixel.com/' + width + '/' + height + '/' + style + '/' + (i % 10) ,
            color: colors[ (i*10) % colors.length],
            odd: (i % 2 === 0)
        });
    };

    function addSlides(target, style, quantity, width, height) {
        for (var i=0; i < quantity; i++) {
            addSlide(target, style, width, height);
        }
    }

    $scope.slidesIntro = [];
    addSlides($scope.slidesIntro, 'technics', 3, 1900, 250);

    // 1st ngRepeat demo
    $scope.slides = [];
    addSlides($scope.slides, 'sports', 50);

    // 2nd ngRepeat demo
    $scope.slides2 = [];
    $scope.slideIndex = 0;
    addSlides($scope.slides2, 'city', 5);


    // demo with controls
    $scope.slides4 = [];
    addSlides($scope.slides4, 'people', 5);
    $scope.pushSlide = function() {
        addSlides($scope.slides4, 'people', 3);
    }
    $scope.prev = function() {
        $scope.slideIndex--;
    }
    $scope.next = function() {
        $scope.slideIndex++;
    }
    $scope.swipe = true;
    $scope.toggleSwipe = function() {
        $scope.swipe = !$scope.swipe;
    }

    // 4rd demo, object based iterable
    $scope.slideIndex3 = 2;
    $scope.slides3 = {
        '#1': colors[5],
        '#2': colors[15],
        '#3': colors[25],
        '#4': colors[35],
        '#5': colors[45]
    }

    // thumbs demo
    $scope.slideIndex2 = 2;

    // ngIf demo
    $scope.showCarousel = false;
    $scope.demo = {
        ifIndex: 2
    }
    $scope.slides5 = [
        colors[5],
        colors[15],
        colors[25],
        colors[35],
        colors[45]
    ]

    // 6th ngRepeat demo
    var slides6 = [];
    addSlides(slides6, 'fashion', 12);
    console.log(slides6)
    $scope.demo6 = new CarouselRevolunet(slides6, 3);

    // 7th ngRepeat demo
    $scope.slides7 = [];
    addSlides($scope.slides7, 'animals', 5);

    // 7th ngRepeat demo
    $scope.slides8 = [];
    addSlides($scope.slides8, 'nightlife', 5);

})
/*
 * Partition
 *
 * Filter to slice an array in subarray of the desired size
 * Used in items carousels
 *
 */
  .filter('partition', function() {
    var cache = {};
    var filter = function(arr, size) {
      if (!arr) { return; }
      var newArr = [];
      for (var i=0; i<arr.length; i+=size) {
        newArr.push(arr.slice(i, i+size));
      }
      var arrString = JSON.stringify(arr);
      var fromCache = cache[arrString+size];
      if (JSON.stringify(fromCache) === JSON.stringify(newArr)) {
        return fromCache;
      }
      cache[arrString+size] = newArr;
      return newArr;
    };
    return filter;
  });