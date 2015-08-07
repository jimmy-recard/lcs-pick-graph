/**
 * This file lets you make group of champions (aka team) a champion can be picked into
 * It's only use is to save some code in champion.js#pickChamp
 */

var config = require('../config/config');
var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase(config.NEO4J_URL);
var async = require('async');

module.exports = {

  /**
   * @function Creates a `team` and connects it to the champions it consists of
   * @param team An array of champion names
   */
  create: function(team, callback) {

    // name of the team, to know where to join
    var name = team.sort().join('');

    // Since we ignore the first two pick-phases, there are only four left
    // 2 picks into 2
    // 2 picks into 3
    // 2 picks into 4
    // 1 pick into 5

    var inserts = [];

    // first create team node (n:Team)
    inserts.push(function(_callback) {
      db.cypher({
        query: 'merge (n:Team {name: {name}})',
        params: {
          name: name
        }
      }, _callback);
    });

    team.forEach(function(c) {

      inserts.push(function(_callback) {

        var query = [
          'MATCH (t:Team {name: {teamName}}), (c:Champion {name: {championName}})',
          'CREATE UNIQUE (t)-[r:CONSISTS_OF]->(c)'
        ].join('\n');

        var params = {
          teamName: name,
          championName: c
        };

        db.cypher({
          query: query,
          params: params
        }, _callback);

      });

    });

    // run inserts
    async.series(inserts, callback);

  }

};
