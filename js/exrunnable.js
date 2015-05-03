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
        curLineColor: "#DDF"
    };


    function create(env) {
        mergeDict(env, DEFAULT_ENV);

        env.isRunning = false;
        env.setCurrentLine = setCurrentLine;
        env.consoleText = "";
        env.vars = {};
        env.varsList = [];
        env.step = step;
        env.run = run;
        env.pause = pause;
        env.reset = reset;
        env.assign = assign;
        env.print = print;

        env.onCreateVarListeners = [];
        env.onChangeVarListeners = [];
        env.onCompleteListeners = [];
        env.addChangeVarListener = addChangeVarListener;
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


    function step() {
        var nextLine;
        var funcs = this.code.funcs;
        var i = this.curLine;

        if (i < funcs.length) {
            var f = funcs[i];

            if (f) {
                nextLine = f(this);
            }
        }

        if (typeof nextLine !== "undefined") {
            f = funcs[nextLine];
            if (f && f.isEndLoop) {
                nextLine = f(this);
            }

            this.setCurrentLine(nextLine);
        } else {
            do {
                f = funcs[++i];
            } while (f === exr.SKIP);

            if (f && f.isEndLoop) {
                i = f(this);
            }

            this.setCurrentLine(i);

            if (this.isRunning && this.curLine >= this.code.funcs.length) {
                this.notifyComplete();
            }
        }
    }


    function run() {
        if (!this.isRunning) {
            var env = this;

            this.isRunning = true;
            this.runTimerId = setInterval(function () {
                env.step();
            }, 1000 / this.runClock);

            if (this.runBtn) {
                this.runBtn.value = "pause";
            }
        }
    }


    function pause() {
        if (this.isRunning) {
            this.isRunning = false;
            clearInterval(this.runTimerId);

            if (this.runBtn) {
                this.runBtn.value = "run";
            }
        }
    }


    function reset() {
        this.code.reset();

        if (this.showConsole) {
            this.console.innerHTML = "";
            this.consoleText = "";
        }

        this.setCurrentLine(this.startLine);

        this.vars = {};
        this.varsList = [];
        clearVarsTable(this);

        this.setup();
    }


    function assign(varName, val) {
        if (!(varName in this.vars)) {
            this.varsList.push(varName);
            this.vars[varName] = val;
            this.notifyCreateVar(varName, val);
            this.notifyChangeVar(varName, val);
        } else {
            this.vars[varName] = val;
            this.notifyChangeVar(varName, val);
        }
    }


    function print(s, newline) {
        if (!this.showConsole) {
            return;
        }


        s = formatVarVal(s, true);

        if (newline) {
            s += "\n";
        }

        this.consoleText += s;
        this.console.innerHTML = this.consoleText;

        this.console.scrollTop = this.console.scrollHeight;
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


    function formatVarVal(val, isConsole) {
        if (typeof val === "string") {
            if (!isConsole) {
                val = ["\"", val, "\""].join("");
            }
        } else if (Object.prototype.toString.call(val) === "[object Array]") {
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
                arr.push(formatVarVal(val[key], isConsole));
            }

            arr.push("}");

            val = arr.join("");
        } else {
            val = "" + val;
        }

        if (!isConsole) {
            val = val.replace("\n", "\\n");
        }

        return val;
    }


    function getVarIndex(varsList, varName) {
        for (var i = 0; i < varsList.length; i++) {
            if (varsList[i] === varName) {
                return i;
            }
        }

        return -1;
    }


    function addChangeVarListener(listener) {
        this.onChangeVarListeners.push(listener);
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

        arr.push("<tr><th>Name</th><th>Value</th></tr>");

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
        div.innerHTML = "<input class='step-button' type='button' value='step' />" +
                        (env.showRunButton ? "<input class='run-button' type='button' value='run' />" : "") +
                        "<input class='reset-button' type='button' value='reset' />";

        env.container.appendChild(div);
        env.container.insertBefore(div, env.container.firstChild);

        var stepBtn = div.getElementsByClassName("step-button")[0];
        stepBtn.onclick = function () { env.step(); };

        if (env.showRunButton) {
            env.runBtn = div.getElementsByClassName("run-button")[0];
            env.runBtn.onclick = function () {
                if (env.isRunning) {
                    env.pause();
                } else {
                    env.run();
                }
            };

            env.onCompleteListeners.push(function () { env.pause(); });
        }

        var resetBtn = div.getElementsByClassName("reset-button")[0];
        resetBtn.onclick = function () { env.reset(); };
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
