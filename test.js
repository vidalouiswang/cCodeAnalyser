(function () {
    //test code

    let fs = require("fs");

    if (!fs.existsSync("./src/")) {
        throw new Error("can't find \"./src\"");
    }

    if (!fs.existsSync("./json/")) {
        fs.mkdirSync("./json/");
    }

    let files = fs.readdirSync("./src");

    if (!files || !files.length) {
        throw new Error("can't find files in source folder");
    }

    let counter = 0;

    for (let i of files) {
        if (i.endsWith(".c")) {
            counter++;
            let src = fs.readFileSync("./src/" + i).toString();

            let json = require("./analyser").cCodeAnalyser(src);

            fs.writeFileSync("./json/ast_" + i + ".json", JSON.stringify(json));
        }
    }

    console.log(`${counter} files have been analysed`);

})();
