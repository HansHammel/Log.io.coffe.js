var path = require('path');
var jsStringEscape = require('js-string-escape');
var glob = require("glob");
var ref1 = require('child_process');
var spawn = ref1.spawn; 
var exec = ref1.exec;
var fs = require('fs');
var Sync = require('sync');
var sleep = require('sleep').sleep;

const ENV = './node_modules/.bin/';
const NODE = "node";
const BROWSERIFY = "sh " + ENV + "browserify";
const COFFEE = "sh " + ENV + "coffee";
const MOCHA = "sh " + ENV + "mocha";
const LESS = "sh " + ENV + "lessc";
const TEMPLATE_SRC = path.join(__dirname,"templates");
const TEMPLATE_OUTPUT = path.join(__dirname,"src","templates.js");

 
var task = function(a,b,c) {
  //console.log(b);
	c();
};



var copyFiles = function(files, destFolder) {
  files.forEach(function(filename) {
    var out = fs.createWriteStream(path.join(destFolder, path.basename(filename)));
    fs.createReadStream(filename).pipe(out);
  });
}

var copyGlob = function(pattern, destFolder, cb) {
  glob(pattern, function(err, files) {
    copyFiles(files, destFolder);
    if (cb) cb(err, files);
  });
}

var copyGlobSync = function(pattern, destFolder) {
  copyFiles(glob.sync(pattern), destFolder);
}

function copyFile(from, to) {
  return fs.createReadStream(from).pipe(fs.createWriteStream(to));
};


function exportify(f) {
  var body, content, templateExportName, templateFilePath, templateName;
  templateName = f.replace('.html', '');
  templateExportName = templateName.replace('-', '.');
  templateFilePath = path.join(TEMPLATE_SRC,f);
  body = fs.readFileSync(templateFilePath, 'utf-8');
  //return content = "exports." + templateExportName + " = \"\"\"" + body + "\"\"\"";
  return content = "exports." + templateExportName + " = \"" + jsStringEscape(body) + "\"\;";
};

function rmDir(dirPath, removeSelf) {
      if (removeSelf === undefined)
        removeSelf = true;
      try { var files = fs.readdirSync(dirPath); }
      catch(e) { return; }
      if (files.length > 0)
        for (var i = 0; i < files.length; i++) {
          var filePath = path.join(dirPath, files[i]);
          if (fs.statSync(filePath).isFile())
            fs.unlinkSync(filePath);
          else
            rmDir(filePath);
        }
      if (removeSelf)
        fs.rmdirSync(dirPath);
    };

function build() {
	
	console.log("Building...");
	sleep(1);
	task('templates', "Cleans lib/ folder", function() {
	  console.log("Cleaning lib/ folder");
	  rmDir(path.join(__dirname,'lib'));
		});
	sleep(1);
	task('templates', "Compiles templates/*.html to src/templates.coffee", function() {
	  console.log("Generating src/templates.js from templates/*.html");
	  var content, f, files, templateBlocks;
	  files = fs.readdirSync(TEMPLATE_SRC);
	  console.log(files);
	    var i, len, results;
	    results = [];
	    for (i = 0, len = files.length; i < len; i++) {
	      f = files[i];
	      results.push(exportify(f));
	    }
	    
	  content = '// TEMPLATES.COFFEE IS AUTO-GENERATED. CHANGES WILL BE LOST!\n';
	  content += '(function() {'+'\n';
	  content += results.join('\n\n');
	  content += '\n\n'+'}).call(this);';
	  return fs.writeFileSync(TEMPLATE_OUTPUT, content, 'utf-8');
	  /*
	  return exec(COFFEE + " --compile " + TEMPLATE_OUTPUT , function(err, stdout, stderr) {
	    if (err) {
	      throw err;
	    }
	    if (stdout + stderr) {
	      return console.log(stdout + stderr);
	    }
	  });
	  */
	});
	
	/*
	task('compile', "Compiles CoffeeScript src/*.coffee to lib/*.js", function() {
	  console.log("Compiling src/*.coffee to lib/*.js");
	  return exec(COFFEE + " --compile --output " + path.join(__dirname,"lib") + " " + path.join(__dirname,"src"), function(err, stdout, stderr) {
	    if (err) {
	      throw err;
	    }
	    if (stdout + stderr) {
	      return console.log(stdout + stderr);
	    }
	  });
	});
	*/
	sleep(1);
	task('less', "Compiles less templates to CSS", function() {
	  console.log("Compiling src/less/* to lib/log.io.css");
	  return exec(LESS + " " + path.join(__dirname,"src","less","log.io.less") + "  " + path.join (__dirname,"lib","log.io.css"), function(err, stdout, stderr) {
	    if (err) {
	      throw err;
	    }
	    if (stdout + stderr) {
	      return console.log(stdout + stderr);
	    }
	  });
	});
	sleep(1);
	task('browserify', "Compiles client.js to browser-friendly JS", function() {
	  console.log("Browserifying src/client.js to lib/log.io.js");
	  return exec(BROWSERIFY + " src/client.js --exports process,require -o " + path.join(__dirname,"lib","log.io.js"), function(err, stdout, stderr) {
	    if (err) {
	      return console.log(stdout + stderr);
	    }
	  });
	});
	sleep(1);
	task('copy', "Copy src/*.js to lib/*.js", function() {
	  console.log("Copy src/*.js to lib/*.js");
		copyGlobSync('./src/*.js','./lib');
	});
	
};

function configuration() {
	
	task('configuration', "Ensures that config files exist in ~/.log.io/", function() {
		console.log("Ensures that config files exist in ~/.log.io/");
	  var c, homedir, i, ldir, len, ref2, results;
	  console.log("Creating ~/.log.io/ for configuration files.");
	  console.log("If this fails, run npm using a specific user: npm install -g log.io --user 'ubuntu'");
	  homedir = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
	  ldir = homedir + '/.log.io/';
	  if (!fs.existsSync(ldir)) {
	    fs.mkdirSync(ldir);
	  }
	  ref2 = ['harvester', 'log_server', 'web_server'];
	  results = [];
	  for (i = 0, len = ref2.length; i < len; i++) {
	    c = ref2[i];
	    path = ldir + (c + ".conf");
	    if (!fs.existsSync(path)) {
	      results.push(copyFile("./conf/" + c + ".conf", path));
	    } else {
	      results.push(void 0);
	    }
	  }
	  return results;
	});
}

module.exports.configuration = configuration;
module.exports.build = build;

require('make-runnable');


