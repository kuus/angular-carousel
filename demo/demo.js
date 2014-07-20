angular.module('DemoApp', [
    'angular-carousel'
])

.controller('DemoCtrl', function($scope, $timeout) {
    $scope.colors = ["#fc0003", "#f70008", "#f2000d", "#ed0012", "#e80017", "#e3001c", "#de0021", "#d90026", "#d4002b", "#cf0030", "#c90036", "#c4003b", "#bf0040", "#ba0045", "#b5004a", "#b0004f", "#ab0054", "#a60059", "#a1005e", "#9c0063", "#960069", "#91006e", "#8c0073", "#870078", "#82007d", "#7d0082", "#780087", "#73008c", "#6e0091", "#690096", "#63009c", "#5e00a1", "#5900a6", "#5400ab", "#4f00b0", "#4a00b5", "#4500ba", "#4000bf", "#3b00c4", "#3600c9", "#3000cf", "#2b00d4", "#2600d9", "#2100de", "#1c00e3", "#1700e8", "#1200ed", "#0d00f2", "#0800f7", "#0300fc"];

    function addSlide(target, style) {
        var i = target.length;
        target.push({
            label: 'slide #' + (i + 1),
            img: 'http://lorempixel.com/450/300/' + style + '/' + (i % 10) ,
            color: $scope.colors[ (i*10) % $scope.colors.length],
            odd: (i % 2 === 0)
        });
    };

    function addSlides(target, style, qty) {
        for (var i=0; i < qty; i++) {
            addSlide(target, style);
        }
    }

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
        '#1': $scope.colors[5],
        '#2': $scope.colors[15],
        '#3': $scope.colors[25],
        '#4': $scope.colors[35],
        '#5': $scope.colors[45]
    }

    // thumbs demo
    $scope.slideIndex2 = 2;

    // ngIf demo
    $scope.showCarousel = false;
    $scope.demo = {
        ifIndex: 2
    }
    $scope.slides5 = [
        $scope.colors[5],
        $scope.colors[15],
        $scope.colors[25],
        $scope.colors[35],
        $scope.colors[45]
    ]

    // 6th ngRepeat demo
    $scope.slides6 = [];
    // $scope.slideIndex6 = 0;
    addSlides($scope.slides6, 'animals', 5);

    // 7th ngRepeat demo
    $scope.slides7 = [];
    addSlides($scope.slides7, 'nightlife', 5);

});