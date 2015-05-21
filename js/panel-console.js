(function() {
    "use strict";

    exr.initConsole = initConsole;


    function initConsole(env, conf) {
        env.consoleText = "";

        createConsolePanel(env, conf);

        env.addPrintListener(onPrint);
        env.addResetListener(clearConsole);
    }


    function createConsolePanel(env, conf) {
        var panel = env.createPanel();

        panel.innerHTML = ["<textarea class='exr-console' readonly cols='",
            conf.cols, "' rows='", conf.rows, "'></textarea>"].join("");

        env.console = panel.getElementsByClassName("exr-console")[0];
    }


    function clearConsole(env) {
        env.consoleText = "";
        env.console.innerHTML = "";
    }


    function onPrint(env, s) {
        env.consoleText += format(s);
        env.console.innerHTML = env.consoleText;

        env.console.scrollTop = env.console.scrollHeight;
    }


    function format(val) {
        if (Object.prototype.toString.call(val) === "[object Array]") {
            val = ["[", val, "]"].join("");
        } else if (typeof val === "object") {
            var arr = ["{"];
            var first = true;

            for (var key in val) {
                if (first) {
                    first = false;
                } else {
                    arr.push(", ");
                }

                arr.push(key);
                arr.push(": ");
                arr.push(val[key]);
            }

            arr.push("}");

            val = arr.join("");
        } else {
            val = "" + val;
        }

        return val;
    }
})();
