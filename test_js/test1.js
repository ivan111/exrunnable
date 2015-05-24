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
            .vars("f", "&lt;open file 'hankaku.c', mode 'w'&gt;").br()
            .skip(1)
            .print("#define X )*2+1\n").br()
            .print("#define _ )*2\n").br()
            .print("#define s ((((((((0\n").br()
            .print("\n").br()
            .print("char hankaku[4096] = {\n").br()
            .skip(1)
            .vars("i", 1).br()
            .foreach("line", hankaku).br()
                .a(rstrip).br()
                .skip(1)
                .aIf(function (e) { return e.vars("line").indexOf("char") === 0; }).br()
                    .print(function (e) { return "\n/* " + e.vars("line") + " */\n"; }).br()
                .elif(function (e) { return e.vars("line").length === 8; }).br()
                    .vars("line", function (e) { return e.vars("line").replace(/\./g, "_").replace(/\*/g, "X"); }).br()
                    .print(makeStr).br()
                    .aIf(exr.cond("i", "!=", 4096)).br()
                        .print("   ,\n").br()
                    .aElse().br()
                        .print("\n").endIf().br()
                    .add("i", 1).endIf().endForeach().br()
            .skip(1)
            .print("};\n").br()
            .print("\n").br()
            .print("#undef X\n").br()
            .print("#undef _\n").br()
            .print("#undef s\n").br()
            .skip(1)
            .vars("f", "&lt;closed file 'hankaku.c', mode 'w'&gt;");

        var env = exr.createEnv(container, codeTable, code);
        env.startLine = 2;
        env.panels.buttons.isBefore = false;
        env.panels.buttons.showRunButton = true;
        env.panels.console.order = 2;
        env.panels.varsTable.order = 3;
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
