/**
 * This file makes sure every champion is represented by a node at the start of the server
 */

var config = require('../config/config');
var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(config.NEO4J_URL);
var request = require('request');
var async = require('async');
var Team = require('./team');


// create unique name constraint
db.createConstraint({
    label: 'Champion',
    property: 'name',
}, function (err, constraint) {
    if (err) throw err; // just crash for now
    if (constraint) {
        console.log('(Unique Champion:name registered.)');
    } else {
        // constraint already exists
    }
});

module.exports = {

  // updates all champions with api data
  update: function(callback) {

    var url = 'http://ddragon.leagueoflegends.com/cdn/5.2.1/data/en_GB/champion.json';
    request.get(url, function(error, response, body) {

      if(error) {
        throw error;
      }

      var champions = JSON.parse(body).data;
      champions = Object.keys(champions).map(function(i) {
        return {
          name: champions[i].name,
          picture: champions[i].image.full
        };
      });

      // insert every champion
      var inserts = [];

      champions.forEach(function(c) {
        inserts.push(function(_callback) {
          var query = [
            'MERGE (c:Champion {name: {name}, picture: {picture}})'
          ].join('\n');

          var params = {
            name: c.name,
            picture: c.picture
          };

          db.cypher({
            query: query,
            params: params
          }, _callback);

        });
      });

      // run inserts
      async.parallel(inserts, callback);

    });

  },

  /**
   * @function returns all champions in the database
   */
  getAll: function(callback) {

    var query = [
      'MATCH (c:Champion)',
      'RETURN c'
    ].join('\n');

    db.cypher({
      query: query
    }, function(err, result) {
      if(err) return callback(err);
      result = result.map(function(val, idx, arr) {
        return {
          name: val.c.properties.name,
          picture: val.c.properties.picture
        };
      });
      callback(null, result);
    });
  },

  /**
   * @function returns data for a specific champion
   * @param name The name of the champion
   */
  get: function(name, callback) {

    var query = [
      'MATCH (c:Champion {name: {name}})',
      'RETURN c'
    ].join('\n');

    db.cypher({
      query: query,
      params: {
        name: name
      }
    }, function(err, result) {

      if(err) return callback(err);
      if(result.length === 0) {
        return callback(new Error('Champion not found'));
      }

      result = result[0].c.properties; // only return properties
      callback(null, result);

    });

  },

  /**
   * @function creates the relationship 'PICKED_INTO' for a champ and a group of champions it was picked into
   * @param name The name of the picked champion
   * @param enemyTeam An array of names of enemy champions {name} was picked into
   * @param date A simple string representation of the date of the pick
   */
  pickChamp: function(name, enemyTeam, date, callback) {

    console.log(name, enemyTeam, date);

    // create team
    Team.create(enemyTeam, function(errors, results) {
      // async.series callback from Team#create()
      if(errors) return callback(errors);

      // create relationship between {name} and {enemyTeam}
      var query = [
        'MATCH (c:Champion {name: {championName}}), (t:Team {name: {teamName}})',
        'MERGE (c)-[r:PICKED_INTO {date: {date}}]->(t)', // TODO get some properties into {r}
        'ON MATCH SET r.count = r.count + 1',
        'ON CREATE SET r.count = 1'
      ].join('\n');

      var params = {
        championName: name,
        teamName: enemyTeam.sort().join(''),
        date: date
      };

      db.cypher({
        query: query,
        params: params
      }, callback);
    });

  },

  /**
   * @function Returns champions and number of times people picked {name} against
   * @param name The name of the champion to lookup data for
   */
  getPickedVersus: function(name, callback) {

    var query = [
      'MATCH (c:Champion {name: {name}})-[r:PICKED_INTO]->(t:Team)-[CONSISTS_OF]->(a:Champion)',
      'RETURN a.name as name, count(a.name) as count',
      'ORDER BY count DESC'
    ].join('\n');

    var params = {
      name: name
    };

    db.cypher({
      query: query,
      params: params
    }, callback);
  },

  /**
   * @function Returns champions and the number of times they were picked against {name}
   * @param name The name of the champion to lookup data for
   */
  getOpponents: function(name, callback) {

    var query = [
      'MATCH (c:Champion)-[r:PICKED_INTO]->(t:Team)-[CONSISTS_OF]->(a:Champion {name: {name}})',
      'RETURN c.name as name, count(c.name) as count',
      'ORDER BY count DESC'
    ].join('\n');

    var params = {
      name: name
    };

    db.cypher({
      query: query,
      params: params
    }, callback);

  }

};
