(function() {
    "use strict";

    exr.initVarsTable = initVarsTable;


    function initVarsTable(env, conf) {
        createVarsTable(env, conf);

        env.addResetListener(clearVarsTable);
        env.addCallListener(clearVarsTable);
        env.addReturnListener(setVarsTable);
        env.vars.addChangeVarListener(onChangeVar);
    }


    function createVarsTable(env, conf) {
        var panel = env.createPanel(conf.isBefore);

        var table = document.createElement("table");
        table.className = "exr-table";
        table.innerHTML = "<tr><th>Name</th><th>Value</th></tr>";
        panel.appendChild(table);

        env.varsTable = table;
    }


    function clearVarsTable(env) {
        for (var i = env.varsTable.rows.length - 1; i > 0; i--) {
            env.varsTable.deleteRow(i);
        }
    }


    function setVarsTable(env) {
        clearVarsTable(env);

        env.vars.foreach(function (varName, varValue) {
            onChangeVar(env, varName, varValue, true, -1);
        });
    }


    function onChangeVar(env, varName, varValue, flagNew, index) {
        if (flagNew) {
            index = env.varsTable.rows.length - 1;
            var tr = env.varsTable.insertRow(-1);
            tr.className = "exr-vars-" + index;
            tr.insertCell(0);
            tr.insertCell(1);
        } else {
            tr = env.varsTable.getElementsByClassName("exr-vars-" + index)[0];
        }

        tr.childNodes[0].innerHTML = varName;
        tr.childNodes[1].innerHTML = formatVarVal(varValue);
    }


    function formatVarVal(val) {
        if (typeof val === "string") {
            val = ["\"", val, "\""].join("");
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
                arr.push(val[key]);
            }

            arr.push("}");

            val = arr.join("");
        } else {
            val = "" + val;
        }

        val = val.replace("\n", "\\n");

        return val;
    }
})();
