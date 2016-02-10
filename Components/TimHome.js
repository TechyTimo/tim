'use strict';

var React = require('react-native');
var Q = require('q')
var Keychain = require('react-native-keychain')
var ResourceList = require('./ResourceList');
var VideoPlayer = require('./VideoPlayer')
var AddNewIdentity = require('./AddNewIdentity');
var NewResource = require('./NewResource');
var ResourceView = require('./ResourceView');
var utils = require('../utils/utils');
var Reflux = require('reflux');
var Actions = require('../Actions/Actions');
var Store = require('../Store/Store');
var reactMixin = require('react-mixin');
var sampleData = require('../data/data');
var constants = require('@tradle/constants');
var BACKUPS = require('asyncstorage-backup')
var Device = require('react-native-device');
var debug = require('debug')('Tradle-Home')
var TradleLogo = require('../img/Tradle.png')
var TradleWhite = require('../img/TradleW.png')
var BG_IMAGE = require('../img/bg.png')
var PasswordCheck = require('./PasswordCheck')
var TouchIDOptIn = require('./TouchIDOptIn')
var commitHash = require('react-native-env').commit

// var Progress = require('react-native-progress')
import {
  authenticateUser,
  hasTouchID
} from '../utils/localAuth'
const PASSWORD_ITEM_KEY = 'app-password'

var {
  StyleSheet,
  Text,
  Navigator,
  View,
  TouchableHighlight,
  TouchableWithoutFeedback,
  ActivityIndicatorIOS,
  Image,
  Component,
  ScrollView,
  LinkingIOS,
  StatusBarIOS,
  AlertIOS
} = React;


class TimHome extends Component {
  props: {
    modelName: PropTypes.string.isRequired,
    navigator: PropTypes.object.isRequired
  };
	constructor(props) {
	  super(props);
	  this.state = {
	    isLoading: true,
      isModalOpen: false,
	  };
	}
  componentWillMount() {
    let url = LinkingIOS.popInitialURL();
    Actions.start();
  }
  componentDidMount() {
    this.listenTo(Store, 'handleEvent');
  }
  shouldComponentUpdate(nextProps, nextState) {
    if (this.state.isLoading  !== nextState.isLoading  ||
        this.state.message !== nextState.message)
      return true
    else
      return false
  }
  handleEvent(params) {
    if (params.action === 'reloadDB') {
      this.setState({
        isLoading: false,
        message: 'Please restart TiM'
      });
      utils.setModels(params.models);
    }
    else if (params.action === 'start') {
      if (this.state.message) {
        this.restartTiM()
        return
      }

      utils.setMe(params.me);
      utils.setModels(params.models);
      this.setState({isLoading: false});
      this.signIn(() => this.showOfficialAccounts())
    }
    else if (params.action === 'getMe') {
      utils.setMe(params.me)
      var nav = this.props.navigator
      this.signIn(() => this.showOfficialAccounts())
    }
  }

  signIn(cb) {
    let self = this

    let me = utils.getMe()
    if (!me)
      return this.register(cb)

    if (me.isAuthenticated)
      return cb()

    let doneWaiting
    let authPromise = me.useTouchId
      ? touchIDWithFallback()
      : passwordAuth()

    return authPromise
      .then(() => {
        Actions.setAuthenticated({me: me, authenticated: true})
        cb()
      })
      .catch(err => {
        if (err.name == 'LAErrorUserCancel' || err.name === 'LAErrorSystemCancel') {
          self.props.navigator.popToTop()
        } else {
          lockUp(err.message || 'Authentication failed')
        }
      })

    function touchIDWithFallback() {
      return authenticateUser()
      .catch((err) => {
        if (err.name === 'LAErrorUserFallback' || err.name.indexOf('TouchID') !== -1) {
          return passwordAuth()
        }

        throw err
      })
    }

    function passwordAuth () {
      return Keychain.getGenericPassword(PASSWORD_ITEM_KEY)
        .then(
          () =>  Q.ninvoke(self, 'checkPassword'),
          // registration must have been aborted.
          // ask user to set a password
          (err) => Q.ninvoke(self, 'setPassword')
        )
    }

    function lockUp (err) {
      self.setState({isModalOpen: true})
      loopAlert(err)
      setTimeout(() => {
        doneWaiting = true
        // let the user try again
        self.signIn(cb)
      }, __DEV__ ? 5000 : 5 * 60 * 1000)
    }

    function loopAlert (err) {
      AlertIOS.alert(err, null, [
        {
          text: 'OK',
          onPress: () => !doneWaiting && loopAlert(err)
        }
      ])
    }
  }
  setPassword(cb) {
    let self = this
    this.props.navigator.push({
      component: PasswordCheck,
      id: 20,
      passProps: {
        mode: PasswordCheck.Modes.set,
        validate: (pass) => { return pass.length > 4 },
        promptSet: 'Please draw a gesture password',
        promptInvalidSet: 'Password must have 5 or more points',
        onSuccess: (pass) => {
          Keychain.setGenericPassword(PASSWORD_ITEM_KEY, utils.hashPassword(pass))
          .then(() => {
            return hasTouchID()
              .then(() => {
                return true
              })
              .catch((err) => {
                return false
              })
          })
          .then((askTouchID) => {
            if (askTouchID) {
              return self.props.navigator.push({
                component: TouchIDOptIn,
                id: 21,
                rightButtonTitle: 'Skip',
                passProps: {
                  optIn: () => {
                    var me = utils.getMe()
                    me.useTouchId = true
                    Actions.addItem({
                      resource: me,
                      value: me,
                      meta: utils.getModel(me[constants.TYPE]).value
                    })

                    cb()
                  }
                },
                onRightButtonPress: cb.bind(this)
              })
            }

            cb()
          })
          .catch(err => {
            debugger
          })
        },
        onFail: () => {
          debugger
          React.Alert.alert('Oops!')
        }
      }
    })
  }
  checkPassword(cb, doReplace) {
    let nav = this.props.navigator

    let route = {
      component: PasswordCheck,
      id: 20,
      passProps: {
        mode: PasswordCheck.Modes.check,
        maxAttempts: 3,
        promptCheck: 'Draw your gesture password',
        promptRetryCheck: 'Gesture not recognized, please try again',
        isCorrect: (pass) => {
          return Keychain.getGenericPassword(PASSWORD_ITEM_KEY)
            .then((stored) => {
              return stored === utils.hashPassword(pass)
            })
            .catch(err => {
              return false
            })
        },
        onSuccess: () => {
          cb()
        },
        onFail: (err) => {
          cb(err || new Error('For the safety of your data, ' +
            'this application has been temporarily locked. ' +
            'Please try in 5 minutes.'))
          // lock up the app for 10 mins? idk
        }
      }
    }

    nav.push(route)
  }
	showContacts() {
    let passProps = {
        filter: '',
        modelName: this.props.modelName,
        sortProperty: 'lastMessageTime'
      };
    let me = utils.getMe();
    this.props.navigator.push({
      // sceneConfig: Navigator.SceneConfigs.FloatFromBottom,
      id: 10,
      title: 'Contacts',
      // titleTextColor: '#7AAAC3',
      backButtonTitle: 'Back',
      component: ResourceList,
      rightButtonTitle: 'Profile',
      passProps: passProps,
      onRightButtonPress: {
        title: utils.getDisplayName(me, utils.getModel(me[constants.TYPE]).value.properties),
        id: 3,
        component: ResourceView,
        // titleTextColor: '#7AAAC3',
        rightButtonTitle: 'Edit',
        onRightButtonPress: {
          title: me.firstName,
          id: 4,
          component: NewResource,
          // titleTextColor: '#7AAAC3',
          backButtonTitle: 'Back',
          rightButtonTitle: 'Done',
          passProps: {
            model: utils.getModel(me[constants.TYPE]).value,
            resource: me,
          }
        },
        passProps: {resource: me}
      }
    });
	}
  showOfficialAccounts() {
    var nav = this.props.navigator
    nav.immediatelyResetRouteStack(nav.getCurrentRoutes().slice(0,1));
    let resource = utils.getMe()
    let title = resource.firstName;
    nav.push({
      title: 'Official Accounts',
      id: 10,
      component: ResourceList,
      backButtonTitle: 'Back',
      passProps: {
        modelName: constants.TYPES.ORGANIZATION
      },
      rightButtonTitle: 'Profile',
      onRightButtonPress: {
        title: title,
        id: 3,
        component: ResourceView,
        backButtonTitle: 'Back',
        rightButtonTitle: 'Edit',
        onRightButtonPress: {
          title: title,
          id: 4,
          component: NewResource,
          backButtonTitle: 'Back',
          rightButtonTitle: 'Done',
          passProps: {
            model: utils.getModel(resource[constants.TYPE]).value,
            resource: resource
          }
        },
        passProps: {resource: resource}
      }
    })
  }

  // showCommunities() {
  //   var passProps = {
  //       filter: '',
  //       modelName: 'tradle.Community',
  //     };
  //   var me = utils.getMe();
  //   this.props.navigator.push({
  //     // sceneConfig: Navigator.SceneConfigs.FloatFromBottom,
  //     id: 10,
  //     title: 'Communities',
  //     titleTextColor: '#7AAAC3',
  //     backButtonTitle: 'Back',
  //     component: ResourceList,
  //     passProps: passProps,
  //   });
  // }
  register(cb) {
    let modelName = this.props.modelName;
    if (!utils.getModel(modelName)) {
      this.setState({err: 'Can find model: ' + modelName});
      return;
    }
    let model = utils.getModel(modelName).value;
    let route = {
      component: NewResource,
      titleTextColor: '#BCD3E6',
      id: 4,
      passProps: {
        model: model,
        callback: () => {
          cb()
        }
      },
    };

    let self = this
    // route.passProps.callback = this.setPassword.bind(this, function(err) {
    //   self.showOfficialAccounts(true)
    // })
    let nav = self.props.navigator
    route.passProps.callback = (me) => {
      this.showVideoTour(() => {
        Actions.getMe()
        nav.immediatelyResetRouteStack(nav.getCurrentRoutes().slice(0,1));
      })
    }

    route.passProps.editCols = ['firstName', 'lastName']
    route.titleTintColor = '#ffffff'
    this.props.navigator.push(route);
  }
  showVideoTour(cb) {
    let onEnd = (err) => {
      if (err) debug('failed to load video', err)
      cb()
    }

    this.props.navigator.replace({
      // sceneConfig: Navigator.SceneConfigs.FloatFromBottom,
      id: 18,
//      title: 'Tradle',
//      titleTintColor: '#eeeeee',
      component: VideoPlayer,
      rightButtonTitle: __DEV__ ? 'Skip' : undefined,
      passProps: {
        uri: 'videotour',
        onEnd: onEnd,
        onError: onEnd,
        navigator: this.props.navigator
      },
      onRightButtonPress: onEnd
    })
  }
  onReloadDBPressed() {
    utils.setMe(null);
    utils.setModels(null);
    Actions.reloadDB();
  }
  onReloadModels() {
    utils.setModels(null)
    Actions.reloadModels()
  }
  async onBackupPressed() {
    let backupNumber = await BACKUPS.backup()
    AlertIOS.alert(
      `Backed up to #${backupNumber}`
    )
  }
  async onLoadFromBackupPressed() {
    try {
      let backupNumber = await BACKUPS.loadFromBackup()
      AlertIOS.alert(
        `Loaded from backup #${backupNumber}. Please refresh`
      )
    } catch (err) {
      AlertIOS.alert(
        `${err.message}`
      )
    }
  }
  render() {
    StatusBarIOS.setHidden(true);
    if (this.state.message) {
      this.restartTiM()
      return
    }
    var url = LinkingIOS.popInitialURL();
    var d = Device
    var h = d.height > 800 ? d.height - 220 : d.height - 180
    // var cTop = h / 4

    var thumb = d.width > 400
              ? { width: d.width / 2.2, height: d.width / 2.2 }
              : styles.thumb
              // <Progress.CircleSnail color={'white'} size={70} thickness={5}/>
  	var spinner =  <View>
          <Image source={BG_IMAGE} style={{position:'absolute', left: 0, top: 0, width: d.width, height: d.height}} />
          <ScrollView
            scrollEnabled={false}
            style={{height:h}}>
            <View style={[styles.container]}>
              <Image style={thumb} source={require('../img/TradleW.png')}></Image>
              <Text style={styles.tradle}>Tradle</Text>
            </View>
            <View style={{alignItems: 'center'}}>
              <ActivityIndicatorIOS hidden='true' size='large' color='#ffffff'/>
            </View>
          </ScrollView>
          </View>
    if (this.state.isLoading)
      return spinner
    var err = this.state.err || '';
    var errStyle = err ? styles.err : {'padding': 0, 'height': 0};
    var myId = sampleData.getMyId() || utils.getMe();
    // var editProfile, communities;

    // if (utils.getMe()) {
    //   editProfile = <TouchableHighlight
    //                     underlayColor='#2E3B4E' onPress={this.register.bind(this)}>
    //                   <Text style={styles.text}>
    //                     {'Edit Profile'}
    //                   </Text>
    //                 </TouchableHighlight>
    //   // communities = <TouchableWithoutFeedback style={styles.communities} onPress={this.showCommunities.bind(this)}>
    //   //                 <Text style={styles.communitiesText}>Communities</Text>
    //   //               </TouchableWithoutFeedback>
    // }
    // else {
    //   editProfile = <View />;
    //   // communities = <View style={{marginTop: 20}}/>;
    // }
    // else  {
    //   var r = {_t: this.props.modelName};
    //   editProfile = <AddNewIdentity resource={r} isRegistration={true} navigator={this.props.navigator} />;
    // }
        // <Text style={styles.title}>Trust in Motion (TiM)</Text>
    var me = utils.getMe()
    // var dev = __DEV__
    //         ? <View style={styles.dev}>
    //           <TouchableHighlight
    //               underlayColor='transparent' onPress={this.onReloadDBPressed.bind(this)}>
    //             <Text style={styles.text}>
    //               Reload DB
    //             </Text>
    //           </TouchableHighlight>
    //           <TouchableHighlight
    //               underlayColor='transparent' onPress={this.onReloadModels.bind(this)}>
    //             <Text style={styles.text}>
    //               Reload Models
    //             </Text>
    //           </TouchableHighlight>
    //           <TouchableHighlight
    //               underlayColor='transparent' onPress={this.onBackupPressed.bind(this)}>
    //             <Text style={styles.text}>
    //               Backup
    //             </Text>
    //           </TouchableHighlight>
    //           <TouchableHighlight
    //               underlayColor='transparent' onPress={this.onLoadFromBackupPressed.bind(this)}>
    //             <Text style={styles.text}>
    //               Load
    //             </Text>
    //           </TouchableHighlight>
    //           <TouchableHighlight
    //               underlayColor='transparent' onPress={this.onSettingsPressed.bind(this)}>
    //             <Text style={styles.text}>
    //               Settings
    //             </Text>
    //           </TouchableHighlight>
    //         </View>
    //       : <View style={styles.dev}>
    //           <TouchableHighlight
    //               underlayColor='transparent' onPress={this.onSettingsPressed.bind(this)}>
    //             <Text style={styles.text}>
    //               Settings
    //             </Text>
    //           </TouchableHighlight>
    //         </View>

    // var settings = <View/>
    var settings = utils.getMe()
                 ? <View />
                 : <TouchableHighlight
                      underlayColor='transparent' onPress={this.onSettingsPressed.bind(this)}>
                     <Text style={styles.text}>
                       Settings
                     </Text>
                  </TouchableHighlight>

    var dev = __DEV__
            ? <View style={styles.dev}>
              <TouchableHighlight
                  underlayColor='transparent' onPress={this.onReloadDBPressed.bind(this)}>
                <Text style={styles.text}>
                  Reload DB
                </Text>
              </TouchableHighlight>
              <TouchableHighlight
                  underlayColor='transparent' onPress={this.onReloadModels.bind(this)}>
                <Text style={styles.text}>
                  Reload Models
                </Text>
              </TouchableHighlight>
              <TouchableHighlight
                  underlayColor='transparent' onPress={this.onBackupPressed.bind(this)}>
                <Text style={styles.text}>
                  Backup
                </Text>
              </TouchableHighlight>
              <TouchableHighlight
                  underlayColor='transparent' onPress={this.onLoadFromBackupPressed.bind(this)}>
                <Text style={styles.text}>
                  Load
                </Text>
              </TouchableHighlight>
              {settings}
            </View>
          : <View style={[styles.dev, { flexDirection: 'column' }]}>
              {settings}
              <View>
                <Text style={styles.version}>git: {commitHash}</Text>
              </View>
            </View>

    return (
      <View style={styles.scroll}>
        <Image source={BG_IMAGE} style={{position:'absolute', left: 0, top: 0, width: d.width, height: d.height}} />
        <ScrollView
          scrollEnabled={false}
          style={{height:h}}
        >
          <TouchableHighlight style={[styles.thumbButton]}
            underlayColor='transparent' onPress={() => this._pressHandler()}>
            <View style={[styles.container]}>
              <View>
                <Image style={thumb} source={require('../img/TradleW.png')}></Image>
                <Text style={styles.tradle}>Tradle</Text>
              </View>
            </View>
          </TouchableHighlight>
        </ScrollView>
        <View style={{height: 90}}></View>
          <TouchableHighlight style={[styles.thumbButton]}
                underlayColor='transparent' onPress={() => this._pressHandler()}>
            <View style={styles.getStarted}>
               <Text style={styles.getStartedText}>Get started</Text>
            </View>
          </TouchableHighlight>
          <Text style={errStyle}>{err}</Text>
          {dev}
        <View style={{height: 200}}></View>
      </View>
    );
  }
  async onSettingsPressed() {
    try {
      await authenticateUser()
    } catch (err) {
      return
    }

    var model = utils.getModel('tradle.Settings').value
    var route = {
      component: NewResource,
      title: 'Settings',
      backButtonTitle: 'Back',
      rightButtonTitle: 'Done',
      id: 4,
      titleTextColor: '#7AAAC3',
      passProps: {
        model: model,
        callback: this.props.navigator.pop
        // callback: this.register.bind(this)
      },
    }

    this.props.navigator.push(route)
  }
  restartTiM() {
    AlertIOS.alert(
      'Please restart TiM'
    )
  }

  _pressHandler() {
    this.signIn(() => this.showOfficialAccounts())
  }
  // async _localAuth() {
    // if (this.state.authenticating) return

    // if (!this.state.authenticated) {
    //   this.setState({ authenticating: true })
    //   try {
    //     await authenticateUser()
    //   } catch (err)  {
    //     this.setState({ authenticating: false })
    //     throw err
    //   }
    // }

    // this.showOfficialAccounts()
    // if (this.state.authenticating) {
    //   this.setState({ authenticating: false })
    // }
  // }
}
          // {spinner}
          // <View style={{height: 400}}></View>
          // <View style={styles.dev}>
          //   {editProfile}
          //   <TouchableHighlight
          //       underlayColor='#2E3B4E' onPress={this.onReloadDBPressed.bind(this)}>
          //     <Text style={styles.text}>
          //       Reload DB
          //     </Text>
          //   </TouchableHighlight>
          // </View>

reactMixin(TimHome.prototype, Reflux.ListenerMixin);

var styles = StyleSheet.create({
  container: {
    padding: 30,
    marginTop: Device.height > 800 ? Device.height/7 : Device.height / 5,
    alignItems: 'center',
  },
  tradle: {
    // color: '#7AAAC3',
    color: '#eeeeee',
    fontSize: Device.height > 450 ? 35 : 25,
    alignSelf: 'center',
  },
  text: {
    color: '#7AAAC3',
    paddingHorizontal: 5,
    fontSize: 14,
  },
  thumbButton: {
    // marginBottom: 10,
    alignSelf: 'center',
    justifyContent: 'center',
    // padding: 40,
  },
  thumb: {
    width: 170,
    height: 170,
  },
  communitiesText: {
    color: '#f8920d',
    fontSize: 20,
  },
  communities: {
    paddingBottom: 40,
    alignSelf: 'center',
  },
  title: {
    marginTop: 30,
    alignSelf: 'center',
    fontSize: 20,
    color: '#7AAAC3'
  },
  dev: {
    marginTop: 10,
    flexDirection: 'row',
    marginBottom: 500,
    alignSelf: 'center'
  },
  getStartedText: {
    color: '#f0f0f0',
    fontSize: Device.width > 450 ? 35 : 20,
    fontWeight:'400'
  },
  getStarted: {
    backgroundColor: '#568FBE', //'#2892C6',
    paddingVertical: 10,
    paddingHorizontal: 30
  },
  version: {
    color: '#ffffff',
    fontSize: 10,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  }
});


module.exports = TimHome;
  // easeInQuad(t) {
  //   return t * t;
  // }
  // f() {
  //   var infiniteDuration = 1000;
  //   var easeDuration = 300;
  //     AnimationExperimental.startAnimation({
  //       node: this.refs['search'],
  //       duration: infiniteDuration,
  //       // easing: 'easeInQuad',
  //       easing: (t) => this.easeInQuad(Math.min(1, t*infiniteDuration/easeDuration)),
  //       property: 'scaleXY',
  //       toValue: [1,1]
  //       // property: 'position',
  //       // toValue: {x:200, y:-30},
  //       // delay: 30000
  //     })
  // }
  // signIn(cb) {
  //   let self = this
  //   if (this.state.message) {
  //     this.restartTiM()
  //     return
  //   }

  //   let me = utils.getMe()
  //   if (!me) return this.register()

  //   if (isAuthenticated()) {
  //     return cb()
  //   }

  //   let doneWaiting
  //   let authPromise = isAuthenticated() ? Q()
  //     : me.useTouchId ? touchIDWithFallback()
  //     : passwordAuth()

  //   return authPromise
  //     .then(() => {
  //       setAuthenticated(true)
  //       cb()
  //     })
  //     .catch(err => {
  //       if (err.name == 'LAErrorUserCancel' || err.name === 'LAErrorSystemCancel') {
  //         self.props.navigator.popToTop()
  //       } else {
  //         lockUp(err.message || 'Authentication failed')
  //       }
  //     })

  //   function touchIDWithFallback() {
  //     return authenticateUser()
  //     .catch((err) => {
  //       if (err.name === 'LAErrorUserFallback' || err.name.indexOf('TouchID') !== -1) {
  //         return passwordAuth()
  //       }

  //       throw err
  //     })
  //   }

  //   function passwordAuth () {
  //     return Keychain.getGenericPassword(PASSWORD_ITEM_KEY)
  //       .catch(err => {
  //         // registration must have been aborted.
  //         // ask user to set a password
  //         return Q.ninvoke(self, 'setPassword')
  //       })
  //       .then(() => {
  //         return Q.ninvoke(self, 'checkPassword')
  //       })
  //   }

  //   function lockUp (err) {
  //     self.setState({isModalOpen: true})
  //     loopAlert(err)
  //     setTimeout(() => {
  //       doneWaiting = true
  //       // let the user try again
  //       self.signIn(cb)
  //     }, __DEV__ ? 5000 : 5 * 60 * 1000)
  //   }

  //   function loopAlert (err) {
  //     AlertIOS.alert(err, null, [
  //       {
  //         text: 'OK',
  //         onPress: () => !doneWaiting && loopAlert(err)
  //       }
  //     ])
  //   }
  // }
  // signUp(cb) {
  //   var nav = this.props.navigator
  //   nav.immediatelyResetRouteStack(nav.getCurrentRoutes().slice(0,1));
  //   let self = this
  //   this.setPassword(function(err) {
  //     if (err)
  //       debug('failed to set password', err)
  //     else {
  //       cb()
  //     }
  //   })
  //   // this.showOfficialAccounts(true);
  //   // this.props.navigator.popToTop();
  // }
