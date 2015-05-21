(function() {
    "use strict";

    exr.initButtons = initButtons;


    function initButtons(env, conf) {
        createButtonsPanel(env, conf);

        if (conf.showRunButton) {
            env.addRunListener(onRun);
            env.addPauseListener(onPause);
        }
    }


    function createButtonsPanel(env, conf) {
        var panel = env.createPanel(conf.isBefore);

        panel.innerHTML = "<input class='step-button' type='button' value='step' />" +
                        (conf.showRunButton ? "<input class='run-button' type='button' value='run' />" : "") +
                        "<input class='reset-button' type='button' value='reset' />";

        var stepBtn = panel.getElementsByClassName("step-button")[0];
        stepBtn.onclick = function () { env.step(); };

        if (conf.showRunButton) {
            env.runBtn = panel.getElementsByClassName("run-button")[0];
            env.runBtn.onclick = function () {
                if (env.isRunning) {
                    env.pause();
                } else {
                    env.run();
                }
            };

            env.onCompleteListeners.push(function () { env.pause(); });
        }

        var resetBtn = panel.getElementsByClassName("reset-button")[0];
        resetBtn.onclick = function () { env.reset(); };
    }


    function onRun(env) {
        env.runBtn.value = "pause";
    }


    function onPause(env) {
        env.runBtn.value = "run";
    }
})();
