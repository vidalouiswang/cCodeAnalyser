(function () {
    /*

    一位网友(刚毕业的嵌入式专业大学生)
    想自己用WPF做个玩具IDE用来练手
    但是他不知道如何把C语言中的各种关键字提取出来
    所有找我帮忙
    于是我帮他写了这个js文件

*/

    function cCodeAnalyser(cFile) {
        //定义正则表达式
        //define reglugar expression

        //用于匹配头文件
        //for headers
        let include = /\s*#include\s+\\?\s*(?<header>\S+)\/?/gim;

        //用于匹配宏
        //for defines
        let define = /\s*#define\s+(?<const>\S+)\s+\\?\s*(?<value>[\(\)_a-zA-Z0-9\[\]&\|\s\<\>]+[^\s\/])\/?/gim;

        //用于匹配函数
        //for functions
        let fn = /(((static)|(extern))\s+)?(__INLINE\s+)?(?<type>[a-zA-Z0-9_]+)\s+(?<name>[a-zA-Z0-9_]+)\s*\((?<argu>.+)\)\s*((;\s*)|(\{(?<content>[\s\S]+)\}))/gim;

        //用于匹配变量声明，包括普通声明，声明+初始化，函数参数列表
        //for variables(including normal declaration or with initializing expression) and argument list
        let variable = /\s*(?<type>(unsigned\s+)?[a-zA-Z0-9_\*]+)\s+(?<name>[a-zA-Z0-9_\*]+)\s*((;)|(,)|(\))|(.{1}=\s*(?<value>\S+);))/gim;

        //用于匹配struct和union，包含带typdef和不带的
        //for struct and union, including expression with typedef and none typedef
        let structAndUnion = /(typedef\s+)?(?<type>(struct\s+)|(union+))\s*(?<structName>[a-zA-Z0-9_]+)?\s*\{[\s\S]+?\}\s*(?<defName>[a-zA-Z0-9_]+)?;?/gim;

        //用于清除换行符和头文件的双引号和尖括号
        //to clear cr, lf, quotation mark, and angle bracket
        let pattern = /[\r\n"\<\>]/gi;

        //用于存储返回值
        //to store return values
        let rtnValue = {
            headers: [],
            defines: [],
            functions: [],
            structs: [],
            unions: []
        };

        //find headers
        let g = include.exec(cFile)
        while (g) {
            //把找到的头文件名称去掉双引号、尖括号之后存储到返回值数组
            //type指示头文件的类型，本地类型和库

            //find headers and clear useless mark then put them into the array
            //the "type" will show the type between local and lib
            rtnValue.headers.push({
                file: g.groups.header.trim().replace(pattern, ""),
                type: g.groups.header.includes("\"") ? "local" : "lib"
            });

            //继续查找
            //keep searching
            g = include.exec(cFile)
        }

        //find defines
        g = null;
        g = define.exec(cFile);
        while (g) {
            rtnValue.defines.push({
                name: g.groups.const.replace(pattern, ""),
                value: g.groups.value.replace(pattern, "")
            });
            g = define.exec(cFile);
        }


        //find functions
        g = null;
        g = fn.exec(cFile);

        //关键字用于删除误匹配的注释中的项目
        //these keywords if for deleting useless item, like comments
        let keywords = [
            "is",
            "not",
            "on",
            "abort",
            "or",
            "current",
            "disable",
            "complete",
            "be",
            "of",
            "enable",
            "another",
            "other",
            "new",
            "return"
        ];

        while (g) {
            g = g.groups;
            //定义一个json用于保存函数结构
            //a json object to store function structure
            let json = {
                type: g.type.trim().replace(pattern, ""), //函数返回值类型 function return type
                name: g.name.trim().replace(pattern, ""), //函数名称 function name
                argumentList: [], //参数列表，数组 argument list
                insideVariables: [] //内部变量列表，数组 variables inside the function
            };

            //如果是函数定义，非声明
            //if isn't function declaration
            if (g.content) {

                //就从函数定义中查找内部变量
                //首先去除掉换行
                //find all inside variables
                //remove cr and lf first
                g.content = g.content.replace(/[\r\n]/gi, "");

                //开始查找
                //start searching
                let insideVariable = variable.exec(g.content);
                while (insideVariable) {
                    //简写
                    //a short name
                    insideVariable = insideVariable.groups;

                    //用于存储变量结构
                    //to sotre variable structure
                    let jsonForInsideVariable = { type: insideVariable.type.trim() };

                    //变量名称去掉两边空格
                    insideVariable.name = insideVariable.name.trim();

                    //去除掉非法名称和类型
                    if (
                        insideVariable.name != "" &&
                        insideVariable.name != "*" &&
                        jsonForInsideVariable.type != "" &&
                        jsonForInsideVariable.type != "*" &&
                        !keywords.includes(jsonForInsideVariable.type.toLowerCase())
                    ) {
                        //规范化*的位置，统一把*放到类型后
                        //put "*" stick with the variable name
                        if (insideVariable.name.includes("*")) {
                            jsonForInsideVariable.type += "*";
                            //去掉名称中的*
                            insideVariable.name = insideVariable.name.replace("*", "");
                        }

                        //赋值
                        jsonForInsideVariable.name = insideVariable.name;

                        //填写初始化的值
                        jsonForInsideVariable.value = insideVariable.value ? insideVariable.value : null;

                        //加入内部变量数组
                        //put object in to inner variable array
                        json.insideVariables.push(jsonForInsideVariable);

                    }

                    //继续下次查找
                    //keep searching
                    insideVariable = variable.exec(g.content);
                }
            }

            //把匹配出的函数参数列表按,分隔
            //split argument list string with ","
            let a = g.argu.trim().split(",");

            for (let i of a) {
                //去除空字符串
                //remove empty string
                if (i) {
                    //按空格分隔
                    //split with space
                    let b = i.split(" ");
                    let argu = {};
                    argu.type = b[0].trim();
                    if (b[1]) {
                        //规范化*的位置，统一放到类型旁边
                        //put * stick with type name
                        if (b[1].includes("*")) {
                            argu.type += "*";
                            argu.name = b[1].replace("*", "").replace(pattern, "");
                        } else {
                            argu.name = b[1].replace(pattern, "");
                        }
                    }
                    //添加到列表
                    //add to list
                    json.argumentList.push(argu);
                }
            }

            //继续寻找
            //keep searching
            rtnValue.functions.push(json);
            g = fn.exec(cFile);
        }


        //寻找struct和union
        //search struct and union
        g = null;
        g = structAndUnion.exec(cFile);
        while (g) {
            g = g.groups;
            //去掉无用符号
            //remove useless mark
            g.type = g.type.replace(pattern, "");

            //用于存放struct或union的json
            //to store struct or union
            let json = {
                type: g.type, //type name
                structName: g.structName || "", //struct name
                defName: g.defName.replace(pattern, "") || "" //define name
            };

            json.structName = json.structName ? json.structName.replace(pattern, "") : "";
            json.defName = json.defName ? json.defName.replace(pattern, "") : "";

            //放到数组里面去
            //push into array
            rtnValue[json.type + "s"].push(json);

            //继续寻找
            //keep seaching
            g = structAndUnion.exec(cFile);
        }
        return rtnValue;
    };

    module.exports = {
        cCodeAnalyser: cCodeAnalyser
    };


})();
