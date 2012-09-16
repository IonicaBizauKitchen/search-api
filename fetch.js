
/**
 * Module dependencies.
 */

var wiki = require('component-wiki')
  , request = require('superagent')
  , redis = require('redis')
  , db = redis.createClient()
  , fs = require('fs');

// NOTE: quick / horrid code lives here ;D

var pending = 0;
var packages;

db.flushdb();

wiki(function(err, pkgs){
  if (err) throw err;
  packages = pkgs;

  pkgs.forEach(function(pkg){
    if (!pkg) return;
    console.log();
    console.log('%s:', pkg.name);
    var words = [pkg.name];
    words = words.concat(parse(pkg.description));
    words = words.concat(pkg.keywords || []);

    ++pending;
    request
    .get('https://api.github.com/repos/' + pkg.repo + '/stargazers')
    .end(function(res){
      done();

      if (res.ok) {
        pkg.stars = res.body.length;
        console.log('%s stars: %d', pkg.repo, pkg.stars);
      }

      ++pending;
      db.set('component:' + pkg.repo, JSON.stringify(pkg), done);
    })

    ++pending;
    db.sadd('components', pkg.repo, done);

    words.forEach(function(word){
      console.log('  "%s"', word);
      ++pending;
      db.sadd('word:' + word, pkg.repo, done);
    });
  });
})

function parse(str) {
  return str.match(/\w+/).map(function(word){
    return word.toLowerCase();
  });
}

function done() {
  --pending || (function(){
    fs.writeFileSync('components.json', JSON.stringify(packages));
    process.exit();
  })();
}