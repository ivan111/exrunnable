(function() {
    "use strict";

    exr.Code = Code;
    exr.cond = cond;


    function Code() {
        // funcs[0]はコードの１行目で、関数の配列。
        this.funcs = [[]];

        this.defs = {};

        this.defStack = [];
        this.forStack = [];
        this.whileStack = [];
        this.foreachStack = [];
        this.ifStack = [];
    }


    function SKIP() {
    }

    SKIP.isSkip = true;


    function NOP() {
    }


    function cond(varName, op, constVal) {
        switch (op) {
        case "==": return function (e) { return e.vars(varName) === constVal; };
        case "!=": return function (e) { return e.vars(varName) !== constVal; };
        case "<": return function (e) { return e.vars(varName) < constVal; };
        case "<=": return function (e) { return e.vars(varName) <= constVal; };
        case ">": return function (e) { return e.vars(varName) > constVal; };
        case ">=": return function (e) { return e.vars(varName) >= constVal; };
        }

        throw "unknown op: " + op;
    }


    Code.prototype.asert = function () {
        if (this.defStack.length !== 0) {
            throw "num(def) != num(endDef). defStack.length = " + this.defStack.length;
        }

        if (this.forStack.length !== 0) {
            throw "num(for) != num(endFor). forStack.length = " + this.forStack.length;
        }

        if (this.whileStack.length !== 0) {
            throw "num(while) != num(endWhile). whileStack.length = " + this.whileStack.length;
        }

        if (this.foreachStack.length !== 0) {
            throw "num(foreach) != num(endForeach). foreachStack.length = " + this.foreachStack.length;
        }

        if (this.ifStack.length !== 0) {
            throw "num(if) != num(endIf). ifStack.length = " + this.ifStack.length;
        }
    };


    Code.prototype.reset = function () {
        this.funcs.forEach(function (funcList) {
            funcList.forEach(function (f) {
                if (f.reset) {
                    f.reset();
                }
            });
        });
    };


    Code.prototype.getCurPos = function () {
        return [this.funcs.length - 1, this.funcs[this.funcs.length - 1].length - 1];
    };


    Code.prototype.getCurLineNo = function () {
        return this.funcs.length - 1;
    };


    Code.prototype.getCurFuncIndex = function () {
        return this.funcs[this.funcs.length - 1].length - 1;
    };


    // 処理を追加
    Code.prototype.a = function (func, lineNo) {
        if (arguments.length === 1) {
            lineNo = this.getCurLineNo();
        }

        var line = this.funcs[lineNo];

        if (typeof line === "undefined") {
            line = [];
            this.funcs[lineNo] = line;
        }

        line.push(func);

        return this;
    };


    // 改行
    Code.prototype.br = function () {
        this.funcs.push([]);

        return this;
    };


    // 最後に追加した命令をスキップ命令にする
    Code.prototype.isSkip = function () {
        var pos = this.getCurPos();

        var funcList = this.funcs[pos[0]];
        var f = funcList[pos[1]];

        f.isSkip = true;

        return this;
    };


    Code.prototype.skip = function (numLines) {
        for (var i = 0; i < numLines; i++) {
            this.br();
        }

        return this;
    };


    Code.prototype.print = function (f, newline) {
        this.a(function (e) {
            var s;

            if (typeof f === "function") {
                s = f(e);
            } else {
                s = f;
            }

            e.print(s, newline);
        });

        return this;
    };


    Code.prototype.printVar = function (varName, newline) {
        this.print(function (e) { return e.vars(varName); }, newline);

        return this;
    };


    Code.prototype.vars = function (varName, varValue) {
        this.a(function (e) {
            if (typeof varValue === "function") {
                e.vars(varName, varValue(e));
            } else {
                e.vars(varName, varValue);
            }
        });

        return this;
    };


    // var1 = var1 op val2
    function op2(op) {
        return function (varName, varValue) {
            this.vars(varName, function (e) {
                return op(e.vars(varName), varValue);
            });

            return this;
        };
    }


    // add("x", 3)  =>  x = x + 3
    Code.prototype.add = op2(function (x, y) { return x + y; });
    Code.prototype.sub = op2(function (x, y) { return x - y; });
    Code.prototype.mul = op2(function (x, y) { return x * y; });
    Code.prototype.div = op2(function (x, y) { return x / y; });


    Code.prototype.stop = function () {
        this.a(function (e) {
            e.pause();

            return e.curLine;
        });

        return this;
    };


    Code.prototype.jump = function (lineNo) {
        var f = function () {
            return lineNo;
        };

        f.isSkip = true;

        this.a(f);

        return this;
    };


    // (Ex) .def("func", ["a", "b"])
    Code.prototype.def = function (funcName, params) {
        if (funcName in this.defs) {
            throw "conflict function name: " + funcName;
        }

        var obj = {};

        if (helpers.isNullOrUndef(params)) {
            params = [];
        }

        // 関数定義を飛び越える
        var f = function () { return obj.endI; };
        f.isSkip = true;
        this.a(f);

        // 関数が呼ばれるとここに来る
        this.a(SKIP);

        this.defs[funcName] = { pos: this.getCurPos(), params: params };

        this.defStack.push({ obj: obj });

        return this;
    };


    Code.prototype.endDef = function () {
        var def = this.defStack.pop();

        this.a(SKIP);

        def.obj.endI = this.getCurPos();

        return this;
    };


    // (Ex) .aCall("func", [1, 2])
    Code.prototype.aCall = function (funcName, args) {
        var code = this;

        this.a(function (e) {
            var a = args;

            if (typeof args === "function") {
                a = args(e);
            }

            e.aCall(funcName, a);

            return code.defs[funcName].pos;
        });

        return this;
    };


    Code.prototype.aReturn = function (f) {
        this.a(function (e) {
            var ret;

            if (typeof f === "function") {
                ret = f(e);
            } else {
                ret = f;
            }

            return e.aReturn(ret);
        });

        return this;
    };


    Code.prototype.aReturnVar = function (varName) {
        if (!isString(varName)) {
            throw "aReturnVarの引数には変数名を指定してください";
        }

        this.a(function (e) {
            var ret = e.vars(varName);

            return e.aReturn(ret);
        });

        return this;
    };


    Code.prototype.aFor = function (times) {
        var i = 0;
        var obj = {};

        function aFor() {
            if (i >= times) {
                i = 0;
                return obj.endI;
            }

            i++;
        }

        aFor.reset = function () {
            i = 0;
        };

        this.a(aFor);

        var forI = this.getCurLineNo();
        this.forStack.push({ i: forI, obj: obj });

        return this;
    };


    Code.prototype.endFor = function () {
        var aFor = this.forStack.pop();

        var f = function () { return aFor.i; };
        f.isSkip = true;

        this.a(f);
        this.a(SKIP);

        aFor.obj.endI = this.getCurPos();

        return this;
    };


    Code.prototype.breakFor = function () {
        var aFor = this.forStack[this.forStack.length - 1];

        this.a(function () { aFor.reset(); return aFor.obj.endI; });

        return this;
    };


    Code.prototype.aWhile = function (condFunc) {
        var obj = {};

        this.a(function (e) {
            if (!condFunc(e)) {
                return obj.endI;
            }
        });

        var whileI = this.getCurLineNo();
        this.whileStack.push({ i: whileI, obj: obj });

        return this;
    };


    Code.prototype.endWhile = function () {
        var aWhile = this.whileStack.pop();

        var f = function () { return aWhile.i; };
        f.isSkip = true;

        this.a(f);
        this.a(SKIP);

        aWhile.obj.endI = this.getCurPos();

        return this;
    };


    Code.prototype.breakWhile = function () {
        var aWhile = this.whileStack[this.whileStack.length - 1];

        this.a(function () { return aWhile.obj.endI; });

        return this;
    };


    Code.prototype.foreach = function (varName, arr) {
        var i = 0;
        var obj = {};
        var bkArr = arr;

        function foreach(e) {
            if (typeof arr === "function") {
                bkArr = arr;
                arr = arr(e);
            }

            if (i >= arr.length) {
                i = 0;
                arr = bkArr;

                return obj.endI;
            }

            e.vars(varName, arr[i]);

            i++;
        }

        foreach.reset = function () {
            i = 0;
            arr = bkArr;
        };

        this.a(foreach);

        var foreachI = this.getCurLineNo();
        this.foreachStack.push({ i: foreachI, obj: obj, reset: foreach.reset });

        return this;
    };


    Code.prototype.endForeach = function () {
        var foreach = this.foreachStack.pop();

        var f = function () { return foreach.i; };
        f.isSkip = true;

        this.a(f);
        this.a(SKIP);

        foreach.obj.endI = this.getCurPos();

        return this;
    };


    Code.prototype.breakForeach = function () {
        var foreach = this.foreachStack[this.foreachStack.length - 1];

        this.a(function () { foreach.reset(); return foreach.obj.endI; });

        return this;
    };


    Code.prototype.aIf = function (condFunc) {
        var obj = {};

        this.a(function (e) {
            if (!condFunc(e)) {
                return obj.elseI;
            }
        });

        this.ifStack.push({ obj: obj, chain: [] });

        return this;
    };


    // elifと同じ行に他の命令はないと仮定している
    Code.prototype.elif = function (condFunc) {
        var aif = this.ifStack.pop();

        var obj = {};
        var chain = aif.chain.concat([obj]);
        this.ifStack.push({ obj: obj, chain: chain });

        var curLineNo = this.getCurLineNo();
        aif.obj.elseI = curLineNo;

        this.a(function () { return obj.endI; }, curLineNo - 1);
        this.a(function (e) {
            if (!condFunc(e)) {
                return obj.elseI;
            }
        });

        return this;
    };


    // elseと同じ行に他の命令はないと仮定している
    Code.prototype.aElse = function () {
        var aif = this.ifStack.pop();

        var obj = {};
        var chain = aif.chain.concat([obj]);
        this.ifStack.push({ obj: obj, chain: chain });

        var curLineNo = this.getCurLineNo();
        aif.obj.elseI = curLineNo;

        this.a(function () { return obj.endI; }, curLineNo - 1);
        this.a(NOP);

        return this;
    };


    Code.prototype.endIf = function () {
        var aif = this.ifStack.pop();

        this.a(SKIP);

        var curPos = this.getCurPos();

        aif.obj.elseI = curPos;

        aif.chain.forEach(function (obj) {
            obj.endI = curPos;
        });

        return this;
    };


    function isString(v) {
        if (typeof v === "string" || v instanceof String) {
            return true;
        }

        return false;
    }
})();
