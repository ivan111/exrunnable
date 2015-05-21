(function() {
    "use strict";

    exr.createVars = createVars;


    function createVars(env) {
        var varsMap = {};
        var varsList = [];
        var frames = [];


        helpers.createEvent(my, "ChangeVar");

        env.addResetListener(function () {
            varsMap = {};
            varsList = [];
            frames = [];
        });


        function my(varName, varValue) {
            if (arguments.length === 1) {
                return varsMap[varName];
            }

            if (arguments.length !== 2) {
                throw "number of args error";
            }

            if (varName in varsMap) {
                var flagNew = false;
            } else {
                flagNew = true;
                varsList.push(varName);
            }

            varsMap[varName] = varValue;
            var i = varsList.indexOf(varName);
            my.notifyChangeVar(env, varName, varValue, flagNew, i);

            return my;
        }


        my.foreach = function (callback) {
            varsList.forEach(function (varName) {
                callback(varName, varsMap[varName]);
            });
        };


        // 関数呼び出しのために、現在の変数をスタックへ保存
        my.save = function () {
            frames.push({
                varsMap: varsMap,
                varsList: varsList
            });

            varsMap = {};
            varsList = [];
        };


        // 関数呼び出しから戻るために、スタックから変数を元に戻す
        my.restore = function () {
            var frame = frames.pop();

            varsMap = frame.varsMap;
            varsList = frame.varsList;
        };


        env.addCallListener(my.save);
        env.addReturnListener(my.restore);


        return my;
    }
})();
