module.exports = function() {

  switch (process.NODE_ENV) {

    case 'development':
      return require('./development.json');
      break;
    case 'production':
      return require('./production.json');
      break;
    default:
      return require('./development.json');
      break;

  }

}(process.NODE_ENV)
