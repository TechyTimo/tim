var React = require('react-native');
var SearchScreen = require('./Components/SearchScreen');
var SearchPage = require('./Components/SearchPage');
var ResourceTypesScreen = require('./Components/ResourceTypesScreen');
var NewResource = require('./Components/NewResource');
var NewItem = require('./Components/NewItem');
var ShowItems = require('./Components/ShowItems');
var ResourceView = require('./Components/ResourceView');
var ArticleView = require('./Components/ArticleView');
var utils = require('./utils/utils');
var AddressBook = require('NativeModules').AddressBook;

var IDENTITY_MODEL = 'tradle.Identity';
var {
  Component,
  NavigatorIOS,
  Navigator,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} = React;

var styles = StyleSheet.create({
  text: {
    color: 'black',
    backgroundColor: 'white',
    fontSize: 30,
    margin: 80
  },
  container: {
    flex: 1
  },
  navBar: {
    backgroundColor: 'white',
  },
  navBarText: {
    fontSize: 16,
    marginVertical: 15,
  },
  navBarTitleText: {
    color: '#2E3B4E',
    fontWeight: '500',
    marginVertical: 14,
  },
  navBarLeftButton: {
    paddingLeft: 15,
  },
  navBarRightButton: {
    paddingRight: 15,
  },
  navBarButtonText: {
    color: '#7AAAC3',
  },
});

class IdentityApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true
    }; 
  }
  componentWillMount() {
    utils.loadModels();
  }    

  render() {
    var props = {modelName: IDENTITY_MODEL};
    return (
      <Navigator
        style={styles.container}
        initialRoute={{
          id: 1,
          title: 'Trust in Motion',
          backButtonTitle: 'Back',
          titleTextColor: '#2E3B4E',
          component: SearchPage,
          passProps: props,
        }}
        renderScene={this.renderScene}
        navigationBar={
          <Navigator.NavigationBar
            routeMapper={NavigationBarRouteMapper}
            style={styles.navBar}
          />
        }
        passProps={props}
        configureScene={(route) => {
          if (route.sceneConfig) 
            return route.sceneConfig;
          return Navigator.SceneConfigs.FloatFromRight;
        }} 
        />
    );
  }

  renderScene(route, nav) {
    var props = route.passProps;
    switch (route.id) {
    case 1:
      return <SearchPage navigator={nav} modelName={IDENTITY_MODEL} filter={props.filter} />;
    case 2:
      return <ResourceTypesScreen navigator={nav} 
                  modelName={props.modelName} 
                  resource={props.resource} 
                  returnRoute={props.returnRoute}
                  callback={props.callback} />;
    case 3:
      return <ResourceView navigator={nav} 
                  resource={props.resource} />;      
    case 4:
      return <NewResource navigator={nav} 
                  resource={props.resource} 
                  metadata={props.metadata}
                  returnRoute={props.returnRoute}
                  callback={props.callback}
                  resourceKey={props.resourceKey} />;      
    case 5:
      return <ShowItems navigator={nav} 
                  resourceKey={props.resourceKey} 
                  parentMeta={props.parentMeta}
                  itemsMeta={props.itemsMeta}
                  resource={props.resource}  />;      
    case 6:
      return <NewItem navigator={nav} 
                  resource={props.resource} 
                  metadata={props.metadata}
                  resourceKey={props.resourceKey} 
                  parentMeta={props.parentMeta}    />;      
    case 7:
      return <ArticleView navigator={nav} url={route.passProps.url} />;      
    case 10:  
    default: // 10
      return <SearchScreen navigator={nav} 
                  filter={props.filter} 
                  resource={props.resource}
                  prop={props.prop}
                  returnRoute={props.returnRoute}
                  callback={props.callback}
                  modelName={props.modelName} />;
    }
  }
}
var NavigationBarRouteMapper = {
  LeftButton: function(route, navigator, index, navState) {
    if (index === 0) {
      return null;
    }

    var previousRoute = navState.routeStack[index - 1];
    return (
      <TouchableOpacity
        onPress={() => navigator.pop()}>
        <View style={styles.navBarLeftButton}>
          <Text style={[styles.navBarText, styles.navBarButtonText]}>
            {previousRoute.title}
          </Text>
        </View>
      </TouchableOpacity>
    );
  },

  RightButton: function(route, navigator, index, navState) {
    if (!route.rightButtonTitle)
      return <View/>
    return (
      <TouchableOpacity
        onPress={() => navigator.push(route.onRightButtonPress)}>
        <View style={styles.navBarRightButton}>
          <Text style={[styles.navBarText, styles.navBarButtonText]}>
            {route.rightButtonTitle}
          </Text>
        </View>
      </TouchableOpacity>
    );
  },

  Title: function(route, navigator, index, navState) {
    return (
      <Text style={[styles.navBarText, styles.navBarTitleText]}>
        {route.title}
      </Text>
    );
  },

};

React.AppRegistry.registerComponent('Identity', function() { return IdentityApp });

  // render() {
  //   var props = {db: this.state.db};
  //   return (
  //     <Navigator
  //       style={styles.container}
  //       initialRoute={{
  //         id: 1,
  //         title: 'Identity Finder',
  //         backButtonTitle: 'Back',
  //         titleTextColor: '#2E3B4E',
  //         component: SearchPage,
  //         passProps: {db: this.state.db},
  //       }}
  //       renderScene={this.renderScene}
  //       passProps={props}
  //       configureScene={(route) => {
  //         if (route.sceneConfig) {
  //           return route.sceneConfig;
  //         }
  //         return Navigator.SceneConfigs.FloatFromBottom;
  //       }}
  //     />
  //   );
  // }
  // componentDidMount() {
  //   var self = this;
  //   var db = this.state.db;
  // dbHasResources = false;
    // db.createReadStream({limit: 1})
    //   .on('data', function (data) {
    //     var m = data.value;
    //     dbHasResources = true;
    //     utils.loadModelsAndMe(db, models)
    //     .then(function(results) {
    //       self.state.isLoading = false;
    //     });
    //   })
    //   .on('error', function (err) {
    //     console.log('Oh my!', err.name + ": " + err.message);
    //   })
    //   .on('close', function (err) {
    //     console.log('Stream closed');
    //   })
    //   .on('end', function () {
    //     console.log('Stream end');
    //     if (!dbHasResources) 
    //       utils.loadDB(db);
    //   });
    // }


  // componentDidMount() {
  //   var self = this;
  //   var db = utils.getDb();
  //   var dbHasResources = false;
  //   db.createReadStream({limit: 1})
  //     .on('data', function (data) {
  //       var m = data.value;
  //       dbHasResources = true;
  //       utils.loadModelsAndMe(db, models)
  //       .then(function(results) {
  //         self.state.isLoading = false;
  //       });
  //     })
  //     .on('error', function (err) {
  //       console.log('Oh my!', err.name + ": " + err.message);
  //     })
  //     .on('close', function (err) {
  //       console.log('Stream closed');
  //     })
  //     .on('end', function () {
  //       console.log('Stream end');
  //       if (!dbHasResources) 
  //         utils.loadDB(db);
  //     });
  //   }

  // componentDidMount1() {
  //   var self = this;
  //   var db = this.state.db;
  //   this.loadModels(db, models)
  //   .then(function() {
  //     AddressBook.checkPermission((err, permission) => {
  //       // AddressBook.PERMISSION_AUTHORIZED || AddressBook.PERMISSION_UNDEFINED || AddressBook.PERMISSION_DENIED 
  //       if(permission === AddressBook.PERMISSION_UNDEFINED){
  //         AddressBook.requestPermission((err, permission) => {
  //           self.storeContacts()
  //         })
  //       }
  //       else if(permission === AddressBook.PERMISSION_AUTHORIZED){
  //         self.storeContacts()
  //       }
  //       else if(permission === AddressBook.PERMISSION_DENIED){
  //         //handle permission denied 
  //       }
  //     })      
  //   });
  // }
  // storeContacts() {
  //   var self = this;
  //   AddressBook.getContacts(function(err, contacts) {
  //     self.props.db.createReadStream()
  //     .on('data', function(data) {
  //       if (data.key.indexOf(IDENTITY_MODEL + '_') == -1)
  //         return;
  //     })
  //     .on('close', function() {
  //       console.log('Stream closed');
  //       return me;
  //     })      
  //     .on('end', function() {
  //       console.log('Stream ended');
  //     })      
  //     .on('error', function(err) {
  //       console.log('err: ' + err);
  //     });
  //     console.log(contacts)
  //   })
  // }  
// The LATEST

  // render() {
  //   return (
  //     <NavigatorIOS
  //       style={styles.container}
  //       barTintColor='#D7E6ED'
  //       tintColor='#7AAAC3'
  //       initialRoute={{
  //         title: 'Trust in Motion',
  //         backButtonTitle: 'Back',
  //         titleTextColor: '#3f4c5f',
  //         component: SearchPage,
  //         passProps: {modelName: IDENTITY_MODEL},
  //       }}/>
  //   );
  // }
  // render1() {
  //   if (this.state.isLoading)
  //     return <View></View>;
  //   var passProps = {
  //     filter: '', 
  //     models: models, 
  //     modelName: IDENTITY_MODEL,
  //   };
  //   if (this.state.me) {
  //     passProps.me = this.state.me;
  //     return <NavigatorIOS
  //       style={styles.container}
  //       barTintColor='#D7E6ED'
  //       tintColor='#7AAAC3'
  //       initialRoute={{
  //         title: 'All Contacts',
  //         titleTextColor: '#7AAAC3',
  //         component: SearchScreen,
  //         passProps: passProps
  //       }} />
  //   }
  //   else {
  //     var metadata = models['model_' + IDENTITY_MODEL].value;
  //     var page = {
  //       metadata: metadata,
  //       models: models,
  //       db: this.state.db,
  //     };

  //     return (
  //       <NavigatorIOS
  //         style={styles.container}
  //         barTintColor='#D7E6ED'
  //         tintColor='#7AAAC3'
  //         initialRoute={{
  //           title: 'Sign Up',
  //           backButtonTitle: 'Back',
  //           titleTextColor: '#7AAAC3',
  //           component: NewResource,
  //           passProps: {page: page},
  //         }}/>
  //     );
  //   }
  // }
  

