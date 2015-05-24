(function() {
    "use strict";

    exr.initCallStack = initCallStack;


    function initCallStack(env, conf) {
        createCallStackTable(env, conf);

        env.addCallListener(push);
        env.addReturnListener(pop);
    }


    function createCallStackTable(env, conf) {
        var panel = env.createPanel(conf.isBefore);

        var table = document.createElement("table");
        table.className = "exr-table";
        table.innerHTML = "";
        panel.appendChild(table);

        env.callStackTable = table;
    }


    function push(env, label) {
        var tr = env.callStackTable.insertRow(0);
        tr.insertCell(0).innerHTML = label;
    }


    function pop(env) {
        env.callStackTable.deleteRow(0);
    }
})();
