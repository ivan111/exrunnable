(function() {
    "use strict";

    exr.Code = Code;
    exr.SKIP = SKIP;


    function Code() {
        this.funcs = [];
        this.forStack = [];
        this.whileStack = [];
        this.foreachStack = [];
        this.ifStack = [];
    }


    function SKIP() {
    }


    function NOP() {
    }


    function seq() {
        var args = arguments;

        return function (e) {
            for (var i = 0; i < args.length; i++) {
                var nextLine = args[i](e);

                if (nextLine) {
                    return nextLine;
                }
            }
        };
    }


    Code.prototype.check = function () {
        if (this.forStack.length !== 0) {
            return "forStack.length = " + this.forStack.length;
        }

        if (this.whileStack.length !== 0) {
            return "whileStack.length = " + this.whileStack.length;
        }

        if (this.foreachStack.length !== 0) {
            return "foreachStack.length = " + this.foreachStack.length;
        }

        if (this.ifStack.length !== 0) {
            return "ifStack.length = " + this.ifStack.length;
        }

        return "";
    };


    Code.prototype.reset = function () {
        this.funcs.forEach(function (f) {
            if (f.reset) {
                f.reset();
            }
        });
    };


    Code.prototype.getCurIndex = function () {
        return this.funcs.length - 1;
    };


    Code.prototype.a = function (f) {
        this.funcs.push(f);

        return this;
    };


    Code.prototype.skip = function (numLines) {
        for (var i = 0; i < numLines; i++) {
            this.funcs.push(SKIP);
        }

        return this;
    };


    Code.prototype.print = function (f, newline) {
        this.funcs.push(function (e) {
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


    Code.prototype.println = function (f) {
        this.print(f, true);

        return this;
    };


    Code.prototype.printVar = function (varName, newline) {
        this.print(function (e) { return e.vars[varName]; }, newline);

        return this;
    };


    Code.prototype.printVarln = function (varName) {
        this.printVar(varName, true);

        return this;
    };


    Code.prototype.assign = function (varName, val) {
        this.funcs.push(function (e) {
            if (typeof val === "function") {
                e.assign(varName, val(e));
            } else {
                e.assign(varName, val);
            }
        });

        return this;
    };


    // var = var op val
    function op2(op) {
        return function (varName, val) {
            this.assign(varName, function (e) {
                return op(e.vars[varName], val);
            });

            return this;
        };
    }


    Code.prototype.add = op2(function (x, y) { return x + y; });
    Code.prototype.sub = op2(function (x, y) { return x - y; });
    Code.prototype.mul = op2(function (x, y) { return x * y; });
    Code.prototype.div = op2(function (x, y) { return x / y; });


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

        this.funcs.push(aFor);

        var forI = this.getCurIndex();
        this.forStack.push({ i: forI, obj: obj });

        return this;
    };


    Code.prototype.endFor = function () {
        var aFor = this.forStack.pop();

        var f = function () { return aFor.i; };

        f.isEndLoop = true;

        this.funcs.push(f);

        aFor.obj.endI = this.getCurIndex() + 1;

        return this;
    };


    Code.prototype.breakFor = function () {
        var aFor = this.forStack[this.forStack.length - 1];

        this.funcs.push(function () { aFor.reset(); return aFor.obj.endI; });

        return this;
    };


    Code.prototype.aWhile = function (cond) {
        var obj = {};

        this.funcs.push(function (e) {
            if (!cond(e)) {
                return obj.endI;
            }
        });

        var whileI = this.getCurIndex();
        this.whileStack.push({ i: whileI, obj: obj });

        return this;
    };


    Code.prototype.endWhile = function () {
        var aWhile = this.whileStack.pop();

        var f = function () { return aWhile.i; };

        f.isEndLoop = true;

        this.funcs.push(f);

        aWhile.obj.endI = this.getCurIndex() + 1;

        return this;
    };


    Code.prototype.breakWhile = function () {
        var aWhile = this.whileStack[this.whileStack.length - 1];

        this.funcs.push(function () { return aWhile.obj.endI; });

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

            e.assign(varName, arr[i]);

            i++;
        }

        foreach.reset = function () {
            i = 0;
            arr = bkArr;
        };

        this.funcs.push(foreach);

        var foreachI = this.getCurIndex();
        this.foreachStack.push({ i: foreachI, obj: obj, reset: foreach.reset });

        return this;
    };


    Code.prototype.endForeach = function () {
        var foreach = this.foreachStack.pop();

        var f = function () { return foreach.i; };

        f.isEndLoop = true;

        this.funcs.push(f);

        foreach.obj.endI = this.getCurIndex() + 1;

        return this;
    };


    Code.prototype.breakForeach = function () {
        var foreach = this.foreachStack[this.foreachStack.length - 1];

        this.funcs.push(function () { foreach.reset(); return foreach.obj.endI; });

        return this;
    };


    Code.prototype.aIf = function (cond) {
        var obj = {};

        this.funcs.push(function (e) {
            if (!cond(e)) {
                return obj.elseI;
            }
        });

        this.ifStack.push({ type: "if", obj: obj, chain: [] });

        return this;
    };


    Code.prototype.elif = function (cond) {
        var obj = {};

        var aif = this.ifStack.pop();

        var chain = aif.chain.concat([obj]);

        var last = this.getCurIndex();

        aif.obj.elseI = last + 1;

        this.funcs.push(function (e) {
            if (!cond(e)) {
                return obj.elseI;
            }
        });

        this.ifStack.push({ type: "elif", obj: obj, chain: chain });

        this.funcs[last] = seq(this.funcs[last], function () { return obj.endI; });

        return this;
    };


    Code.prototype.aElse = function () {
        var aif = this.ifStack.pop();

        var obj = {};

        var chain = aif.chain.concat([obj]);

        var last = this.getCurIndex();

        aif.obj.elseI = last + 1;

        this.funcs.push(NOP);

        this.ifStack.push({ type: "else", obj: obj, chain: chain });

        this.funcs[last] = seq(this.funcs[last], function () { return obj.endI; });

        return this;
    };


    Code.prototype.endIf = function (noSkip) {
        if (!noSkip) {
            this.funcs.push(SKIP);
        }

        var aif = this.ifStack.pop();

        var last = this.getCurIndex();

        aif.obj.elseI = last + 1;

        aif.chain.forEach(function (obj) {
            obj.endI = last + 1;
        });

        return this;
    };
})();
