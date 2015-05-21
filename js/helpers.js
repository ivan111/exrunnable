(function() {
    "use strict";

    window.helpers = {
        isNullOrUndef: isNullOrUndef,
        createEvent: createEvent,
        hasClass: hasClass,
        addClass: addClass,
        removeClass: removeClass
    };


    function isNullOrUndef(v) {
        if (typeof v === "undefined" || v === null) {
            return true;
        }

        return false;
    }


    function createEvent(obj, eventName) {
        var onListenersName = ["on", eventName, "Listeners"].join("");
        var addListenerName = ["add", eventName, "Listener"].join("");
        var removeListenerName = ["remove", eventName, "Listener"].join("");
        var notifyName = "notify" + eventName;

        obj[onListenersName] = [];

        obj[addListenerName] = function (listener) {
            if (obj[onListenersName].indexOf(listener) === -1) {
                obj[onListenersName].push(listener);
            }
        };

        obj[removeListenerName] = function (listener) {
            var i = obj[onListenersName].indexOf(listener);
            if (i !== -1) {
                obj[onListenersName].splice(i, 1);
            }
        };

        obj[notifyName] = function () {
            var args = arguments;

            obj[onListenersName].forEach(function (listener) {
                listener.apply(null, args);
            });
        };
    }


    var name2reMap = {};


    function className2re(className) {
        if (className in name2reMap) {
            var re = name2reMap[className];
        } else {
            re = new RegExp(["(?:^|\\s)", className, "(?!\\S)"].join(""));
            name2reMap[className] = re;
        }

        return re;
    }


    function hasClass(elem, className) {
        var re = className2re(className);

        if (elem.className.match(re)) {
            return true;
        }

        return false;
    }


    function addClass(elem, className) {
        if (!hasClass(elem, className)) {
            if (elem.className === "") {
                elem.className = className;
            } else {
                elem.className += " " + className;
            }
        }
    }


    function removeClass(elem, className) {
        var re = className2re(className);

        elem.className = elem.className.replace(re, "");
    }
})();
