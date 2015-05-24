(function() {
    "use strict";

    window.exr = {
        createEnv: createEnv,
        create: create
    };


    var eventNames = ["Run", "Pause", "Reset", "Call", "Return", "Print", "Complete", "Error"];


    function createEnv(container, codeTable, code) {
        return {
            container: container,
            codeTable: codeTable,
            code: code,
            startLine: 0,
            setup: function () {},

            runClock: 10,
            curLineColor: "#DDF",

            panels: {
                buttons: { order: 1, init: exr.initButtons, isBefore: true, showRunButton: false },
                varsTable: { order: 2, init: exr.initVarsTable },
                console: { order: 3, init: exr.initConsole, cols: 80, rows: 8 }
            }
        };
    }


    function create(env) {
        env.code.asert();

        initMethods(env);

        eventNames.forEach(function (eventName) {
            helpers.createEvent(env, eventName);
        });

        env.isRunning = false;
        env.frames = [];
        env.breakpoints = [];
        env.numLines = env.codeTable.rows.length;

        env.vars = exr.createVars(env);

        setOnLineNoClick(env);

        var panels = toPanelsArray(env.panels);

        panels.forEach(function (conf) {
            if (!conf.hide) {
                conf.init(env, conf);
            }
        });

        env.setup();

        env.setCurrentLine(env.startLine);
        env.curFuncIndex = 0;
    }


    function setOnLineNoClick(env) {
        if (!helpers.hasClass(env.codeTable.rows[0].cells[0], "linenos")) {
            return;
        }

        for (var i = 0; i < env.codeTable.rows.length; i++) {
            var row = env.codeTable.rows[i];
            row.onclick = createOnLineNoClick(env, row, i);
        }
    }


    function createOnLineNoClick(env, row, i) {
        return function () {
            if (env.breakpoints[i]) {
                helpers.removeClass(row, "breakpoint");
                env.breakpoints[i] = false;
            } else {
                helpers.addClass(row, "breakpoint");
                env.breakpoints[i] = true;
            }
        };
    }


    function toPanelsArray(panels) {
        var keys = Object.keys(panels);
        var arr = keys.map(function(key) { return panels[key]; });

        arr.sort(function (a, b) {
            var ao = a.order || 100;
            var bo = b.order || 100;

            return ao - bo;
        });

        return arr;
    }


    function initMethods(env) {
        env.setCurrentLine = setCurrentLine;
        env.step = step;
        env.run = run;
        env.pause = pause;
        env.reset = reset;
        env.aCall = aCall;
        env.aReturn = aReturn;
        env.print = print;
        env.createPanel = createPanel;
    }


    function step() {
        try {
            var jmp = runLine(this, this.curLine, this.curFuncIndex);

            var result = parseJmp(this, jmp, this.curLine);
            var nextLine = result.lineNo;
            var funcIndex = result.funcIndex;

            result = runSkip(this, nextLine, funcIndex);
            nextLine = result.lineNo;

            this.setCurrentLine(nextLine);
            this.curFuncIndex = result.funcIndex;

            if (this.isRunning && this.breakpoints[this.curLine]) {
                this.pause();
            }

            if (this.isRunning && this.curLine >= this.code.funcs.length) {
                this.notifyComplete(this);
            }
        } catch (e) {
            if (this.isRunning) {
                this.pause();
            }

            this.notifyError(e);
        }
    }


    function runLine(env, lineNo, funcIndex) {
        var funcList = env.code.funcs[lineNo];

        if (!funcList) {
            return undefined;
        }

        for (var i = funcIndex; i < funcList.length; i++) {
            var f = funcList[i];
            var jmp = f(env);

            if (!helpers.isNullOrUndef(jmp)) {
                return jmp;
            }
        }
    }


    function runSkip(env, lineNo, funcIndex) {
        for (;;) {
            var funcList = env.code.funcs[lineNo];

            if (!funcList) {
                return {
                    lineNo: lineNo,
                    funcIndex: 0
                };
            }

            var jmp = null;

            for (var i = funcIndex; i < funcList.length; i++) {
                var f = funcList[i];

                if (!f.isSkip) {
                    return {
                        lineNo: lineNo,
                        funcIndex: i
                    };
                }

                jmp = f(env);

                if (!helpers.isNullOrUndef(jmp)) {
                    break;
                }
            }

            var result = parseJmp(env, jmp, lineNo);
            lineNo = result.lineNo;
            funcIndex = result.funcIndex;
        }
    }


    function parseJmp(env, jmp, curLine) {
        if (helpers.isNullOrUndef(jmp)) {
            return {
                lineNo: curLine + 1,
                funcIndex: 0
            };
        }

        if (typeof jmp === "number") {
            return {
                lineNo: Math.floor(jmp),
                funcIndex: 0
            };
        }

        if (typeof jmp === "string" || jmp instanceof String) {
            return env.code.labels[jmp];
        }

        return {
            lineNo: jmp[0],
            funcIndex: jmp[1]
        };
    }


    function run() {
        if (!this.isRunning) {
            var env = this;

            this.isRunning = true;
            this.runTimerId = setInterval(function () {
                env.step();
            }, 1000 / this.runClock);

            this.notifyRun(this);
        }
    }


    function pause() {
        if (this.isRunning) {
            this.isRunning = false;
            clearInterval(this.runTimerId);

            this.notifyPause(this);
        }
    }


    function reset() {
        this.code.reset();

        this.setCurrentLine(this.startLine);

        this.notifyReset(this);

        this.setup();
    }


    function aCall(funcName, args) {
        var retAddr = [this.curLine, this.curFuncIndex + 1];

        this.frames.push({
            retAddr: retAddr
        });

        this.notifyCall(this, funcName, this.curLine);

        var params = this.code.defs[funcName].params;

        if (params) {
            for (var i = 0; i < params.length; i++) {
                var param = params[i];
                var arg = args[i];

                this.vars(param, arg);
            }
        }
    }


    function aReturn(ret) {
        var frame = this.frames.pop();

        this.ret = ret;

        this.notifyReturn(this);

        return frame.retAddr;
    }


    function print(s, newline) {
        if (newline) {
            s += "\n";
        }

        this.notifyPrint(this, s);
    }


    function setCurrentLine(curLine) {
        var row = getCodeTableRow(this, this.curLine);

        if (row) {
            helpers.removeClass(row, "selected");
        }

        this.curLine = curLine;

        row = getCodeTableRow(this, this.curLine);

        if (row) {
            helpers.addClass(row, "selected");
        }
    }


    function getCodeTableRow(env, i) {
        if (typeof i === "undefined" || i < 0 || i >= env.numLines) {
            return null;
        }

        return env.codeTable.rows[i];
    }


    function createPanel(isBefore) {
        var div = document.createElement("div");
        div.className = "exr-panel";

        var p = this.container;

        if (isBefore) {
            p.insertBefore(div, p.firstChild);
        } else {
            p.appendChild(div);
        }

        return div;
    }
})();
