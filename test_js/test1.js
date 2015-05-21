(function() {
    "use strict";

    window.test1 = test1;


    var hankaku = [
        "char 0x41\n",
        "........\n",
        "...**...\n",
        "...**...\n",
        "...**...\n",
        "...**...\n",
        "..*..*..\n",
        "..*..*..\n",
        "..*..*..\n",
        "..*..*..\n",
        ".******.\n",
        ".*....*.\n",
        ".*....*.\n",
        ".*....*.\n",
        "***..***\n",
        "........\n",
        "........\n"
    ];


    function test1(container, codeTable) {
        var code = new exr.Code()
            .skip(2)
            .vars("f", "&lt;open file 'hankaku.c', mode 'w'&gt;").nl()
            .skip(1)
            .print("#define X )*2+1\n").nl()
            .print("#define _ )*2\n").nl()
            .print("#define s ((((((((0\n").nl()
            .print("\n").nl()
            .print("char hankaku[4096] = {\n").nl()
            .skip(1)
            .vars("i", 1).nl()
            .foreach("line", hankaku).nl()
                .a(rstrip).nl()
                .skip(1)
                .aIf(function (e) { return e.vars("line").indexOf("char") === 0; }).nl()
                    .print(function (e) { return "\n/* " + e.vars("line") + " */\n"; }).nl()
                .elif(function (e) { return e.vars("line").length === 8; }).nl()
                    .vars("line", function (e) { return e.vars("line").replace(/\./g, "_").replace(/\*/g, "X"); }).nl()
                    .print(makeStr).nl()
                    .aIf(exr.cond("i", "!=", 4096)).nl()
                        .print("   ,\n").nl()
                    .aElse().nl()
                        .print("\n").endIf().nl()
                    .add("i", 1).endIf().endForeach().nl()
            .skip(1)
            .print("};\n").nl()
            .print("\n").nl()
            .print("#undef X\n").nl()
            .print("#undef _\n").nl()
            .print("#undef s\n").nl()
            .skip(1)
            .vars("f", "&lt;closed file 'hankaku.c', mode 'w'&gt;");

        var env = exr.createEnv(container, codeTable, code);
        env.startLine = 2;
        env.panels.buttons.isBefore = false;
        env.panels.buttons.showRunButton = true;
        env.panels.varsTable.order = 4;
        env.panels.console.rows = 30;

        exr.create(env);
    }


    function rstrip(e) {
        var line = e.vars("line").substr(0, e.vars("line").length - 1);
        e.vars("line", line);
    }


    function makeStr(e) {
        var arr = [];
        var line = e.vars("line");

        for (var i = 0; i < line.length; i++) {
            arr.push(line[i]);
        }

        return "s   " + arr.join(" ");
    }
})();
