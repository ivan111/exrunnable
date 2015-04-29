(function() {
    "use strict";

    window.exr = {
        create: create
    };


    var DEFAULT_ENV = {
        container: null,
        example: null,
        startLine: 0,
        setup: function () {},
        code: null,
        maxVarsNum: 5,
        showConsole: true,
        consoleCols: 80,
        consoleRows: 8,
        showVarsTable: true,
        showRunButton: false,
        runClock: 10,
        curLineColor: "#EEF"
    };


    function create(env) {
        mergeDict(env, DEFAULT_ENV);

        env.isRunning = false;
        env.setCurrentLine = setCurrentLine;
        env.consoleText = "";
        env.vars = {};
        env.varsList = [];
        env.assign = assign;

        env.onCreateVarListeners = [];
        env.onChangeVarListeners = [];
        env.onCompleteListeners = [];
        env.notifyCreateVar = notifyCreateVar;
        env.notifyChangeVar = notifyChangeVar;
        env.notifyComplete = notifyComplete;

        env.numLines = addLineTags(env.example);

        createControlPanel(env);

        if (env.showVarsTable) {
            createVarsTable(env);
            env.onCreateVarListeners.push(onCreateVar);
            env.onChangeVarListeners.push(onChangeVar);
        }

        if (env.showConsole) {
            createConsolePanel(env);
        }

        env.setup();

        env.setCurrentLine(env.startLine);
    }


    function assign(varName, val) {
        if (!(varName in this.vars)) {
            this.varsList.push(varName);
            this.vars[varName] = val;
            this.notifyCreateVar(varName, val);
        } else {
            this.vars[varName] = val;
            this.notifyChangeVar(varName, val);
        }
    }


    function onCreateVar(env, varName, val) {
        if (env.varsList.length <= env.maxVarsNum) {
            var tr = env.varsTable.getElementsByClassName("exr-vars-" + (env.varsList.length - 1))[0];

            tr.childNodes[0].innerHTML = varName;
            tr.childNodes[1].innerHTML = formatVarVal(val);
        }
    }


    function onChangeVar(env, varName, val) {
        if (varName in env.vars) {
            var i = getVarIndex(env.varsList, varName);

            if (i !== -1 && i <= env.maxVarsNum) {
                var tr = env.varsTable.getElementsByClassName("exr-vars-" + i)[0];

                tr.childNodes[0].innerHTML = varName;
                tr.childNodes[1].innerHTML = formatVarVal(val);
            }
        }
    }


    function formatVarVal(val) {
        if (typeof val === "string") {
            val = ["\"", val, "\""].join("");
        } else {
            val = "" + val;
        }

        return val.replace("\n", "\\n");
    }


    function getVarIndex(varsList, varName) {
        for (var i = 0; i < varsList.length; i++) {
            if (varsList[i] === varName) {
                return i;
            }
        }

        return -1;
    }


    function notifyCreateVar(varName, val) {
        var env = this;

        this.onCreateVarListeners.forEach(function (listener) {
            listener(env, varName, val);
        });
    }


    function notifyChangeVar(varName, val) {
        var env = this;

        this.onChangeVarListeners.forEach(function (listener) {
            listener(env, varName, val);
        });
    }


    function notifyComplete() {
        var env = this;

        this.onCompleteListeners.forEach(function (listener) {
            listener(env);
        });
    }


    function createVarsTable(env) {
        var arr = [];

        arr.push("<tr><th>変数名</th><th>値</th></tr>");

        for (var i = 0; i < env.maxVarsNum; i++) {
            arr.push("<tr class='exr-vars-");
            arr.push(i);
            arr.push("'><td>　</td><td>　</td></tr>");
        }

        var div = document.createElement("div");
        div.className = "exr-panel";

        var table = document.createElement("table");
        table.className = "exr-table";
        table.innerHTML = arr.join("");
        div.appendChild(table);

        env.container.appendChild(div);
        env.varsTable = table;
    }


    function clearVarsTable(env) {
        if (!env.showVarsTable) {
            return;
        }

        for (var i = 0; i < env.maxVarsNum; i++) {
            var tr = env.varsTable.getElementsByClassName("exr-vars-" + i)[0];

            tr.childNodes[0].innerHTML = "　";
            tr.childNodes[1].innerHTML = "　";
        }
    }


    function setCurrentLine(curLine) {
        var nodes = this.example.getElementsByClassName("exr-line-" + this.curLine);

        if (nodes.length === 1) {
            nodes[0].style.backgroundColor = "";
        }

        this.curLine = curLine;

        nodes = this.example.getElementsByClassName("exr-line-" + this.curLine);

        if (nodes.length === 1) {
            nodes[0].style.backgroundColor = this.curLineColor;
        }
    }


    function addLineTags(example) {
        var htmlLines = example.innerHTML.split("\n");

        var textLines;

        if (typeof example.innerText === "undefined") {
            textLines = example.textContent.split("\n");
        } else {
            textLines = example.innerText.split("\n");
        }

        var html = [];

        textLines.forEach(function (line, lineNo) {
            var space = "";

            if (line.length < 80) {
                space = Array(80 - line.length + 1).join(" ");
            }

            html.push(["<span class='exr-line-", lineNo, "'>", htmlLines[lineNo], space, "</span>"].join(""));
        });

        example.innerHTML = html.join("\n");

        return textLines.length;
    }


    function createControlPanel(env) {
        var div = document.createElement("div");
        div.className = "exr-panel";
        div.innerHTML = "<input class='step-button' type='button' value='ステップ実行' />" +
                        (env.showRunButton ? "<input class='run-button' type='button' value='実行' />" : "") +
                        "<input class='reset-button' type='button' value='リセット' />";

        env.container.appendChild(div);
        env.container.insertBefore(div, env.container.firstChild);

        var stepBtn = div.getElementsByClassName("step-button")[0];
        var stepRun = function () {
            var nextLine;
            var funcs = env.code.funcs;
            var i = env.curLine;

            if (i < funcs.length) {
                var f = funcs[i];

                if (f) {
                    nextLine = f(env);
                }
            }

            if (typeof nextLine !== "undefined") {
                env.setCurrentLine(nextLine);
            } else {
                do {
                    f = funcs[++i];
                } while (f === exr.SKIP);

                env.setCurrentLine(i);

                if (env.isRunning && env.curLine >= env.code.funcs.length) {
                    env.notifyComplete();
                }
            }
        };

        stepBtn.onclick = stepRun;

        if (env.showRunButton) {
            var runBtn = div.getElementsByClassName("run-button")[0];
            runBtn.onclick = function () {
                if (env.isRunning) {
                    env.isRunning = false;
                    clearInterval(env.runTimerId);
                    this.value = "実行";
                } else {
                    env.isRunning = true;
                    env.runTimerId = setInterval(stepRun, 1000 / env.runClock);
                    this.value = "停止";
                }
            };

            env.onCompleteListeners.push(function () {
                env.isRunning = false;
                clearInterval(env.runTimerId);
                runBtn.value = "実行";
            });
        }

        var resetBtn = div.getElementsByClassName("reset-button")[0];
        resetBtn.onclick = function () {
            env.code.reset();

            if (env.showConsole) {
                env.console.innerHTML = "";
                env.consoleText = "";
            }

            env.setCurrentLine(env.startLine);

            env.vars = {};
            env.varsList = [];
            clearVarsTable(env);

            env.setup();
        };
    }


    function createConsolePanel(env) {
        var div = document.createElement("div");
        div.className = "exr-panel";
        div.innerHTML = ["<textarea class='exr-console' readonly cols='",
            env.consoleCols, "' rows='", env.consoleRows, "'></textarea>"].join("");

        env.console = div.getElementsByClassName("exr-console")[0];

        env.container.appendChild(div);
    }


    function mergeDict(dict1, dict2) {
        for (var key in dict2) {
            if (!(key in dict1)) {
                dict1[key] = dict2[key];
            }
        }
    }
})();
