'use strict';

var React = require('react-native');
var utils = require('../utils/utils');

var ArticleView = require('./ArticleView');
var MessageView = require('./MessageView');
var NewResource = require('./NewResource');
var ProductChooser = require('./ProductChooser');
var PhotoList = require('./PhotoList');
var Icon = require('react-native-vector-icons/Ionicons');
var groupByEveryN = require('groupByEveryN');
var constants = require('@tradle/constants');
var LinearGradient = require('react-native-linear-gradient');
var RowMixin = require('./RowMixin');
// var Accordion = require('react-native-accordion')
var extend = require('extend')
var equal = require('deep-equal')
var formDefaults = require('../data/formDefaults')
var reactMixin = require('react-mixin');
var Device = require('react-native-device')
var newProduct = require('../data/newProduct.json')
var STRUCTURED_MESSAGE_BORDER = '#3260a5' //'#2E3B4E' //'#77ADFC' //'#F4F5E6'
// var STRUCTURED_MESSAGE_COLOR = '#77ADFC' //'#4BA0F2' //'#5482C7' //'#2E3B4E' //'#77ADFC' //'#F4F5E6'
var VERIFICATION_BG = '#FBFFE5' //'#F6FFF0';
var DEFAULT_CURRENCY_SYMBOL = '£'

var LINK_COLOR, DEFAULT_LINK_COLOR = '#2892C6'
var STRUCTURED_MESSAGE_COLOR, DEFAULT_STRUCTURED_MESSAGE_COLOR = '#77ADFC'
var {
  Image,
  StyleSheet,
  Text,
  TouchableHighlight,
  AlertIOS,
  Modal,
  Component,
  Navigator,
  View,
  processColor
} = React;

class MessageRow extends Component {
  constructor(props) {
    super(props);
    var resource = this.props.resource;
    var model = utils.getModel(resource[constants.TYPE] || resource.id).value;
    var me = utils.getMe();
    var isMyMessage;
    if (this.props.bankStyle) {
      LINK_COLOR = this.props.bankStyle.LINK_COLOR || DEFAULT_LINK_COLOR
      STRUCTURED_MESSAGE_COLOR = this.props.bankStyle.STRUCTURED_MESSAGE_COLOR || DEFAULT_STRUCTURED_MESSAGE_COLOR
    }
    else {
      LINK_COLOR = DEFAULT_LINK_COLOR
      STRUCTURED_MESSAGE_COLOR = DEFAULT_STRUCTURED_MESSAGE_COLOR
    }
  }
  shouldComponentUpdate(nextProps, nextState) {
    return !equal(this.props.resource, nextProps.resource) ||
           !equal(this.props.to, nextProps.to)             ||
           this.props.sendStatus !== nextProps.sendStatus
  }
  render() {
    var resource = this.props.resource;
    var model = utils.getModel(resource[constants.TYPE] || resource.id).value;
    var me = utils.getMe();

    var isMyMessage = this.isMyMessage();
    var to = this.props.to;
    var ownerPhoto, hasOwnerPhoto = true;

    if (isMyMessage  || !to  ||  !to.photos) {
      ownerPhoto = <View style={{marginVertical: 0}}/>
      hasOwnerPhoto = false;
    }
    else if (to) {
      if (to.photos) {
        var uri = utils.getImageUri(to.photos[0].url);
        ownerPhoto = <Image source={{uri: uri}} style={styles.msgImage} />
        hasOwnerPhoto = true;
      }
      else if (!isMyMessage) {
        var title = resource.to.title.split(' ').map(function(s) {
          return s.charAt(0);
        }).join('');

        ownerPhoto = <LinearGradient colors={['#2B6493', '#417AA9', '#568FBE'].map(processColor)} style={styles.cellRoundImage}>
                       <Text style={styles.cellText}>{title}</Text>
                     </LinearGradient>
        // ownerPhoto = <LinearGradient colors={['#A4CCE0', '#7AAAc3', '#5E92AD']} style={styles.cellRoundImage}>
        //   <Text style={styles.cellText}>{title}</Text>
        // </LinearGradient>
      }
    }

    var renderedRow = [];
    var onPressCall;
    var isNewProduct, isConfirmation
    var isVerification = resource[constants.TYPE] === constants.TYPES.VERIFICATION;
    if (isVerification)
      onPressCall = this.verify.bind(this);
    else {
      var ret = this.formatRow(isMyMessage, model, resource, renderedRow);
      onPressCall = ret ? ret.onPressCall : null
      isNewProduct = ret ? ret.isNewProduct : null
      isConfirmation = ret ? ret.isConfirmation : null
    }
    if (isNewProduct) {
      if (to  &&  to.photos) {
        var uri = utils.getImageUri(to.photos[0].url);
        ownerPhoto = <Image source={{uri: uri}} style={styles.msgImage} />
        hasOwnerPhoto = true;
        isMyMessage = false
      }
    }
    var photoUrls = [];
    var photoListStyle = {height: 3};
    var addStyle, inRow;
    var noMessage = !resource.message  ||  !resource.message.length;
    var isSimpleMessage = resource[constants.TYPE] === constants.TYPES.SIMPLE_MESSAGE
    var isForgetting = model.id === constants.TYPES.FORGET_ME || model.id === constants.TYPES.FORGOT_YOU
    var isAdditionalInfo = !isSimpleMessage  &&  resource[constants.TYPE] === constants.TYPES.ADDITIONAL_INFO;
    if (!renderedRow.length  &&  !isVerification) {
      var vCols = noMessage ? null : utils.getDisplayName(resource, model.properties);
      if (vCols)
        renderedRow = <Text style={styles.resourceTitle} numberOfLines={2}>{vCols}</Text>;
    }
    else {
      var fromHash = resource.from.id;
      if (isMyMessage) {
        if (!noMessage)
          addStyle = /*isNewProduct ? styles.myAdCell :*/ styles.myCell;
      }
      else if (isForgetting)
        addStyle = styles.forgetCell
      else {
        if (!model.style) {
          addStyle = {paddingVertical: 5, paddingHorizontal: 7, borderRadius: 10, borderColor: '#cccccc', backgroundColor: '#ffffff', marginVertical: 2};
          if (isConfirmation)
            addStyle = [addStyle, styles.myConfCell]
        }
      }
      if (isVerification) {
        var vBorder = this.props.bankStyle  &&  this.props.bankStyle.VERIFIED_BORDER_COLOR ? {borderColor: this.props.bankStyle.VERIFIED_BORDER_COLOR} : {borderColor: '#deeeb4'}
        addStyle = [addStyle, {paddingVertical: 5, paddingHorizontal: 7, backgroundColor: VERIFICATION_BG, borderWidth: 1, marginVertical: 2}, vBorder]; //model.style];
      }
      else if (model.style)
        addStyle = [addStyle, {paddingVertical: 5, paddingHorizontal: 7, borderRadius: 10, backgroundColor: STRUCTURED_MESSAGE_COLOR, borderWidth: 1, borderColor: '#deeeb4', marginVertical: 2}]; //model.style];
      else if (isAdditionalInfo)
        addStyle = [addStyle, {paddingVertical: 5, paddingHorizontal: 7, borderRadius: 10, backgroundColor: '#FCF1ED', borderWidth: 1, borderColor: '#FAE9E3', marginVertical: 2}]; //model.style];
      else {
        if (isMyMessage  &&  !isSimpleMessage)
          addStyle = [addStyle, {paddingVertical: 5, paddingHorizontal: 7, borderRadius: 10, backgroundColor: STRUCTURED_MESSAGE_COLOR, borderWidth: 1, borderColor: '#C1E3E8', marginVertical: 2}]; //model.style];
      }
    }
    var properties = model.properties;
    var verPhoto;
    if (properties.photos) {
      if (resource.photos) {
        var len = resource.photos.length;
        inRow = len === 1 ? 1 : (len == 2 || len == 4) ? 2 : 3;
        var style;
        if (inRow === 1)
          style = styles.bigImage;
        else if (inRow === 2)
          style = styles.mediumImage;
        else
          style = styles.image;
        resource.photos.forEach((p) => {
          photoUrls.push({url: utils.getImageUri(p.url)});
        })

        photoListStyle = {
          flexDirection: 'row',
          alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
          // marginLeft: isMyMessage ? 30 : (hasOwnerPhoto ? 45 : 10),
          borderRadius: 10,
          marginBottom: 3,
        }
      }
      else
        verPhoto = <View style={{height: 0, width:0}} />
    }
    var bgStyle = this.props.bankStyle  &&  this.props.bankStyle.BACKGROUND_COLOR ? {backgroundColor: this.props.bankStyle.BACKGROUND_COLOR} : {backgroundColor: '#f7f7f7'}
    var rowStyle = [styles.row, bgStyle];
    var val;
    var date;
    if (resource.time) {
      var previousMessageTime = this.props.previousMessageTime;
      var showTime = !previousMessageTime  ||  this.props.isAggregation;

      if (!showTime)  {
        var prevDate = new Date(previousMessageTime);
        var curDate = new Date(resource.time);
        showTime = resource.time - previousMessageTime > 3600000 ||
                   prevDate.getDate()  !== curDate.getDate()  ||
                   prevDate.getMonth() !== curDate.getMonth() ||
                   prevDate.getYear()  !== curDate.getYear()
      }

      if (showTime)
        val = utils.getFormattedDate(resource.time);
    }

    var date = val
             ? <Text style={styles.date} numberOfLines={1}>{val}</Text>
             : <View />;

    var showMessageBody;
    if (noMessage) {
      if (hasOwnerPhoto)
        showMessageBody = true;
      else if (!model.properties['message'])
        showMessageBody = true;
      else if (isVerification)
        showMessageBody = true;
    }
    else
      showMessageBody = true;
    var messageBody;
    var isSimpleMessage = model.id === constants.TYPES.SIMPLE_MESSAGE;
    var w = Device.width
    var msgWidth = isMyMessage || !hasOwnerPhoto ? w - 70 : w - 50;

    if (showMessageBody) {
      var viewStyle = {flexDirection: 'row', alignSelf: isMyMessage ? (isNewProduct ? 'center' : 'flex-end') : 'flex-start'};
      if (resource.message) {
        if (resource.message.charAt(0) === '['  ||  resource.message.length > 30) {
          // if (!isNewProduct)
            viewStyle.width = msgWidth; //isMyMessage || !hasOwnerPhoto ? w - 70 : w - 50;
            // viewStyle.width = isMyMessage || !hasOwnerPhoto ? 305 : 325;
          // else {
          //   viewStyle.alignSelf = 'stretch'
          //   viewStyle.justifyContent = 'center'
          // }
        }
      }
      if (!isSimpleMessage)
        viewStyle.width = msgWidth; //isMyMessage || !hasOwnerPhoto ? w - 70 : w - 50;
        // viewStyle.width = isMyMessage || !hasOwnerPhoto ? 305 : 325;

      if (isVerification) {
        var msgModel = utils.getModel(resource.document[constants.TYPE]).value;
        var orgName = resource.organization  ? resource.organization.title : ''

        var hdrStyle = this.props.bankStyle  &&  this.props.bankStyle.VERIFIED_HEADER_COLOR ? {backgroundColor: this.props.bankStyle.VERIFIED_HEADER_COLOR} : {backgroundColor: '#289427'}

        renderedRow = <View>
                        <View style={[styles.verifiedHeader, hdrStyle]}>
                          <Icon style={styles.verificationIcon} size={20} name={'android-done'} />
                          <Text style={{fontSize: 16, fontWeight: '600', color: '#FBFFE5', alignSelf: 'center'}}> Verified by {orgName}</Text>
                        </View>
                        <View style={{paddingTop: 5}}>
                          {this.formatDocument(msgModel, resource, this.verify.bind(this))}
                        </View>
                      </View>
                        // <View style={{paddingTop: 5}}>
                        //   <Text style={[styles.resourceTitle, {alignSelf:'flex-end', fontSize: 18, color: '#CCCCB2'}]}>{msgModel.title}</Text>
                        // </View>
      }
      // var rowId = <Text style={{fontWeight: '600', fontSize: 16, color: isMyMessage ? '#ffffff' : '#289427', paddingRight: 3}}>{this.props.messageNumber + '.'}</Text>;
      messageBody =
        <TouchableHighlight onPress={onPressCall ? onPressCall : () => {}} underlayColor='transparent'>
          <View style={[rowStyle, viewStyle]}>
            {ownerPhoto}
            <View style={addStyle ? [styles.textContainer, addStyle] : styles.textContainer}>
              <View style={{flex: 1}}>
                {renderedRow}
             </View>
            </View>
          </View>
        </TouchableHighlight>
    }
    else
      messageBody = <View style={{height: 5}}/>

    var len = photoUrls.length;
    var inRow = len === 1 ? 1 : (len == 2 || len == 4) ? 2 : 3;
    var photoStyle = {};
    var height;

    if (inRow > 0) {
      if (inRow === 1) {
        var ww = Math.max(240, msgWidth / 2)
        var hh = ww * 280 / 240
        photoStyle = [styles.bigImage, {
          width: ww,
          height: hh
        }]
      }
      else if (inRow === 2)
        photoStyle = styles.mediumImage;
      else
        photoStyle = styles.image;
    }

    var viewStyle = { margin:1, backgroundColor: '#f7f7f7' }
    var model = utils.getModel(this.props.resource[constants.TYPE]).value;
    var isLicense = model.id.indexOf('License') !== -1  ||  model.id.indexOf('Passport') !== -1;
    var photoStyle = (isLicense  &&  len === 1) ? styles.bigImageH : photoStyle;
    var verifications = this.showVerifications(rowStyle, viewStyle, addStyle);
      // <View style={viewStyle} ref={resource[constants.ROOT_HASH]}>
    var sendStatus = <View />
    if (this.props.sendStatus  &&  this.props.sendStatus !== null) {
      switch (this.props.sendStatus) {
      case 'Sent':
        sendStatus = <View style={{alignSelf: 'flex-end', flexDirection: 'row', marginHorizontal: 5}}>
                       <Text style={{fontSize: 14, color: '#009900', marginRight: 3}}>{this.props.sendStatus}</Text>
                       <Icon name={'ios-checkmark-outline'} size={15} color='#009900' />
                     </View>
        break
      case 'Chained':
        sendStatus = <View style={{alignSelf: 'flex-end', flexDirection: 'row', marginHorizontal: 5}}>
                       <Text style={{fontSize: 14, color: '#316A99', marginRight: 3}}>{this.props.sendStatus}</Text>
                       <Icon name={'ios-checkmark'} size={15} color='#316A99' />
                     </View>
        break
      default:
        sendStatus = <Text style={{alignSelf: 'flex-end', fontSize: 14, color: '#757575', marginHorizontal: 5}}>{this.props.sendStatus}</Text>
        break
      }
    }

    var bgStyle = this.props.bankStyle  &&  this.props.bankStyle.BACKGROUND_COLOR ? {backgroundColor: this.props.bankStyle.BACKGROUND_COLOR} : {backgroundColor: '#f7f7f7'}
    return (
      <View style={[viewStyle, bgStyle]}>
        {date}
        {messageBody}
        <View style={photoListStyle}>
          <PhotoList photos={photoUrls} resource={this.props.resource} style={[photoStyle, {marginTop: -5}]} navigator={this.props.navigator} numberInRow={inRow} />
        </View>
        {sendStatus}
        {verifications}
      </View>
    );
  }
  editVerificationRequest() {
    var resource = this.props.resource.document;
    var rmodel = utils.getModel(resource[constants.TYPE]).value;
    var title = utils.getDisplayName(resource, rmodel.properties);
    this.props.navigator.push({
      title: title,
      id: 4,
      component: NewResource,
      // titleTextColor: '#999999',
      backButtonTitle: 'Back',
      rightButtonTitle: 'Done',
      passProps: {
        model: rmodel,
        resource: resource,
        additionalInfo: this.props.resource,
        editCols: ['photos']
      }
    })
  }
  showVerifications(rowStyle, viewStyle, addStyle) {
    if (!this.props.verificationsToShare || !this.props.resource.message)
      return <View/>;

    var resource = this.props.resource;
    var msgParts = utils.splitMessage(resource.message);
    // Case when the needed form was sent along with the message
    if (msgParts.length != 2)
      return <View/>

    var msgModel = utils.getModel(msgParts[1]);
    if (!msgModel)
      return <View/>;
    msgModel = msgModel.value;
    var vtt = [];
    var cnt = 0;
    var self = this;
    var chatOrg = this.props.to[constants.TYPE] === constants.TYPES.ORGANIZATION  &&  this.props.to[constants.TYPE] + '_' + this.props.to[constants.ROOT_HASH]
    for (var t in  this.props.verificationsToShare) {
      if (t === msgModel.id) {
        var ver = this.props.verificationsToShare[t];
        var r = ver[0]
        ver.forEach(function(r) {
          if (chatOrg  &&  utils.getId(r.organization) === chatOrg)
            return
          // if (!cnt) {
            var vModel = utils.getModel(r[constants.TYPE]);
            var doc = self.formatDocument(msgModel, r);
            if (cnt) {
              doc = <View key={self.getNextKey()}>
                      <View style={{height: 1, backgroundColor: '#dddddd'}} />
                      {doc}
                    </View>

            }
          // }
          vtt.push(doc);
          cnt++;
        })
      }
    }
    if (!vtt.length)
      return <View />;
    // if (cnt > 1) {
    //   vtt.push(
    //     <View key={this.getNextKey()}>
    //       <View style={{height: 0.5, marginBottom: 5, backgroundColor: '#dddddd'}} />
    //       <TouchableHighlight underlayColor='transparent' onPress={this.showVerificationsFor.bind(this, r, ver)}>
    //         <Text style={styles.verySmallLetters}>{'See ' + (cnt - 1) + ' more verifications here'}</Text>
    //       </TouchableHighlight>
    //     </View>
    //   )
    // }

    var modelTitle = msgModel.title;
    var idx = modelTitle.indexOf('Verification');
    var docType;
    if (idx === -1)
      docType = modelTitle;
    else
      docType = modelTitle.substring(0, idx) + (modelTitle.length === idx + 12 ? '' : modelTitle.substring(idx + 12))

    var msg = utils.getMe().firstName + ', this is your personal privacy assistant. I see you\'ve already had your ' + docType + ' verified.'
    if (vtt.length === 1)
       msg += ' You can tap below to share it with ';
    else
       msg += ' You can tap on any items in the list below to share them with ';
    msg += this.props.to.organization ? (this.props.to.organization.title + '.') : this.props.to.name;
    // var st = [addStyle ? [styles.textContainer, addStyle] : styles.textContainer]
    // st.push({borderWidth: 1, borderColor: '#C1DBCE'})

    return (
      <View style={[rowStyle, viewStyle, {width: Device.width - 50}]} key={this.getNextKey()}>
        <View style={{width: 30}}/>
        <View style={[addStyle ? [styles.textContainer, addStyle] : styles.textContainer]}>
          <View style={{flex: 1}}>
            <View style={styles.assistentBox}>
              <Text style={styles.assistentText}>{msg}</Text>
            </View>
            {vtt}
         </View>
        </View>
      </View>
     );
  }
  // showVerificationsFor(r, verificationsToShare) {

  // }
          // I just sent you a request for {msgModel.title}. {utils.getMe().firstName}, this is your Tradle assistent talking. Tap on one of the items below to share with {isMyMessage ? resource.to.title : resource.from.title}

  onPress(event) {
    this.props.navigator.push({
      id: 7,
      component: ArticleView,
      passProps: {url: this.props.resource.message}
    });
  }
  createNewResource(model) {
    var resource = {
      'from': this.props.resource.to,
      'to': this.props.resource.from,
      'message': this.props.resource.message,
    }
    resource[constants.TYPE] = model.id;

    // Prefill for testing and demoing
    if (model.id in formDefaults)
      extend(true, resource, formDefaults[model.id])

    this.props.navigator.push({
      id: 4,
      title: model.title,
      rightButtonTitle: 'Done',
      backButtonTitle: 'Back',
      component: NewResource,
      // titleTextColor: '#7AAAC3',
      passProps:  {
        model: model,
        resource: resource,
        bankStyle: this.props.bankStyle,
        originatingMessage: this.props.resource
      }
    });
  }

  verify(event) {
    var resource = this.props.resource;
    var isVerification = resource[constants.TYPE] === constants.TYPES.VERIFICATION;
    var r = isVerification ? resource.document : resource

    var passProps = {
      resource: r,
      bankStyle: this.props.bankStyle,
    }
    if (!isVerification)
      passProps.verify = true
    else
      passProps.verification = resource

    var model = utils.getModel(r[constants.TYPE]).value;
    var route = {
      id: 5,
      component: MessageView,
      backButtonTitle: 'Back',
      passProps: passProps,
      title: model.title
    }
    if (this.isMyMessage()) {
      route.rightButtonTitle = 'Edit';
      route.onRightButtonPress = {
        title: 'Edit',
        component: NewResource,
        // titleTextColor: '#7AAAC3',
        id: 4,
        passProps: {
          resource: r,
          metadata: model,
          bankStyle: this.props.bankStyle,
          callback: this.props.onSelect.bund(this, r)
        }
      };
    }
    this.props.navigator.push(route);
  }
  formatRow(isMyMessage, model, resource, renderedRow) {
    var viewCols = model.gridCols || model.viewCols;
    if (!viewCols)
      return
    var verPhoto;
    var vCols = [];
    var first = true;
    var self = this;
    var model = utils.getModel(resource[constants.TYPE] || resource.id).value;

    var properties = model.properties;
    var noMessage = !resource.message  ||  !resource.message.length;
    var onPressCall;

    var isProductList = model.id === constants.TYPES.PRODUCT_LIST
    var isSimpleMessage = isProductList ||  model.id === constants.TYPES.SIMPLE_MESSAGE
    var isForgetting = model.id === constants.TYPES.FORGET_ME || model.id === constants.TYPES.FORGOT_YOU
    var isAdditionalInfo = !isSimpleMessage  &&  resource[constants.TYPE] === constants.TYPES.ADDITIONAL_INFO
    var cnt = 0;
    var isNewProduct, isConfirmation
    var self = this
    viewCols.forEach(function(v) {
      if (properties[v].type === 'array'  ||  properties[v].type === 'date')
        return;
      var style = isSimpleMessage ? styles.resourceTitle : styles.description; //resourceTitle; //(first) ? styles.resourceTitle : styles.description;

      if (properties[v].ref) {
        if (resource[v]) {
          vCols.push(self.getPropRow(properties[v], resource, resource[v].title || resource[v]))
          // var dn = resource[v].title;
          // if (!dn) {
          //   if (typeof resource[v] !== Object)
          //     dn = resource[v]
          //   else
          //     dn = utils.getDisplayName(resource[v], utils.getModel(resource[v][constants.TYPE]).value.properties)
          // }

          // vCols.push(self.getPropRow(dn))
          first = false;
        }
        return;
      }
      if (isMyMessage)
        style = [style, {justifyContent: 'flex-end', color: isAdditionalInfo ? '#2892C6' : '#ffffff'}];

      if (resource[v]                      &&
          properties[v].type === 'string'  &&
          (resource[v].indexOf('http://') == 0  ||  resource[v].indexOf('https://') == 0)) {
        onPressCall = self.onPress.bind(self);
        vCols.push(<Text style={style} numberOfLines={first ? 2 : 1} key={self.getNextKey()}>{resource[v]}</Text>);
      }
      else if (!isProductList  &&  !isForgetting  &&  !model.autoCreate) {
        var val = (properties[v].displayAs)
                ? utils.templateIt(properties[v], resource)
                : resource[v];
        if (model.properties.verifications  &&  !isMyMessage)
          onPressCall = self.verify.bind(self);
        if (isAdditionalInfo)
          style = [style, {paddingBottom: 10, color: '#2892C6'}];
        vCols.push(self.getPropRow(properties[v], resource, val))
      }
      else {
        if (!resource[v]  ||  !resource[v].length)
          return
        var msgParts = utils.splitMessage(resource[v]);
        // Case when the needed form was sent along with the message
        if (msgParts.length === 2) {
          if (resource.welcome) {
            msg = <View key={self.getNextKey()}>
                    <Text style={style}>{msgParts[0]}</Text>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                      <Text style={[style, {color: isMyMessage ? STRUCTURED_MESSAGE_COLOR : LINK_COLOR}]}>{msgParts[1]} </Text>
                      <Icon style={[styles.linkIcon, {color: LINK_COLOR}]} size={20} name={'ios-arrow-right'} />
                    </View>
                  </View>
            vCols.push(msg);
            onPressCall = self.onChooseProduct.bind(self, true)
            return;
          }
          var msgModel = utils.getModel(msgParts[1]);
          if (msgModel) {
            if (self.props.verificationsToShare)
              style = isSimpleMessage ? styles.resourceTitle : styles.description;
            msgModel = msgModel.value;
            if (!msgParts[0].length)
              msgParts[0] = 'I just sent you a request for '; // + msgModel.title;
            if (!isMyMessage  &&  !resource.documentCreated)
              onPressCall = self.createNewResource.bind(self, msgModel);
            isNewProduct = msgParts[0].length  &&  msgParts[0] === 'application for'

            var color = isMyMessage ? (isNewProduct ? {color: LINK_COLOR, fontWeight: '400', fontSize: 18} : {color: STRUCTURED_MESSAGE_COLOR}) : {color: '#2892C6'}
            var link = isMyMessage
                     ? <Text style={[style, color]}>{msgModel.title}</Text>
                     : <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                         <Text style={[style, {color: resource.documentCreated ?  '#757575' : LINK_COLOR}]}>{msgModel.title}</Text>
                         <Icon style={resource.documentCreated  ? styles.linkIconGreyed : [self.linkIcon, {color: LINK_COLOR}]} size={20} name={'ios-arrow-right'} />
                       </View>

            var msg;
            if (isNewProduct) {
              var newMsg = newProduct.msg.replace('{firstName}', utils.getMe().firstName);
              newMsg = newMsg.replace('{product}', msgModel.title)

              msg = <View key={self.getNextKey()}>
                       <Text style={[style, {color: '#000000'}]}>{newMsg}</Text>
                    </View>
                       // {link}
            }
            else
               msg = <View key={self.getNextKey()}>
                       <Text style={style}>{msgParts[0]}</Text>
                       {link}
                     </View>
            vCols.push(msg);
            return;
          }
        }
        else
          isConfirmation = resource[v].indexOf('Congratulations!') !== -1
              // <Icon style={{color: '#289427', alignSelf: 'flex-end', marginTop: -10}} size={20} name={'android-done-all'} />
              // <Icon style={[{color: '#289427', alignSelf: 'flex-end', width: 50, height: 50, marginTop: -45, opacity: 0.1}]} size={50} name={'ios-flower'} />

        if (isConfirmation) {
          style = [style, {color: '#289427', fontSize: 16}]
          vCols.push(
            <View key={self.getNextKey()}>
              <Text style={[style]}>{resource[v]}</Text>
              <Icon style={[{color: '#289427', alignSelf: 'flex-end', width: 50, height: 50, marginTop: -45, opacity: 0.2}]} size={50} name={'ios-flower'} />
              <Icon style={{color: '#289427', alignSelf: 'flex-end', marginTop: -10}} size={20} name={'android-done-all'} />
            </View>
          );

        }
        else
          vCols.push(<Text style={isForgetting ? [style, {fontSize: 18, color: 'ffffff'}] : style} key={self.getNextKey()}>{resource[v]}</Text>);
      }
      first = false;

    });

    if (!isSimpleMessage  &&  !isForgetting)  {
      var t = model.title.split(' ');
      var s = '';
      t.forEach(function(p) {
        if (p.indexOf('Verif') === -1)
          s += p + ' ';
      });

      vCols.push(<Text style={[styles.resourceTitle, styles.formType]} key={this.getNextKey()}>{s}</Text>);
    }
    if (vCols  &&  vCols.length) {
      vCols.forEach(function(v) {
        renderedRow.push(v);
      })
    }
    if (isAdditionalInfo) {
      return isMyMessage ? onPressCall : this.editVerificationRequest.bind(this);
    }
    else {
      var ret = {}
      if (onPressCall)
        ret.onPressCall = onPressCall;
      else if (isForgetting)
        return null
      else if (isSimpleMessage) {
        if (isNewProduct)
          ret.isNewProduct = true
        else if (isConfirmation)
          ret.isConfirmation = true
        else
          return null
      }
      else
        ret.onPressCall = this.props.onSelect.bind(this, resource, null);
      return ret
    }
  }
  getPropRow(prop, resource, val, isVerification) {
    var style = {flexDirection: 'row'}
    if (isVerification) {
      if (!this.props.isAggregation)
        style = [style, {borderWidth: 0.5, paddingVertical: 3, borderTopColor: '#eeeeee', borderBottomColor: VERIFICATION_BG, borderLeftColor: VERIFICATION_BG, borderRightColor: VERIFICATION_BG}]
      return (
        <View style={style} key={this.getNextKey()}>
          <View style={{flex: 1, flexDirection: 'column'}}>
            <Text style={[styles.verySmallLetters, {color: '#555555'}]}>{prop.title}</Text>
          </View>
          <View style={{flex: 1, flexDirection: 'column'}}>
            <Text style={[styles.verySmallLetters, {fontWeight: '500'}]}>{val + (prop.units &&  prop.units.charAt(0) !== '[' ? ' ' + prop.units : '')}</Text>
          </View>
        </View>
      )
    }
    else {
      if (!this.props.isAggregation)
        style = [style, {borderWidth: 0.5, paddingVertical: 3, borderBottomColor: STRUCTURED_MESSAGE_BORDER, borderTopColor: STRUCTURED_MESSAGE_COLOR, borderLeftColor: STRUCTURED_MESSAGE_COLOR, borderRightColor: STRUCTURED_MESSAGE_COLOR}]
      return (
        <View style={style} key={this.getNextKey()}>
          <View style={{flex: 1, flexDirection: 'column'}}>
            <Text style={[styles.descriptionW, {color: '#FFFFEE'}]}>{prop.title}</Text>
          </View>
          <View style={{flex: 1, flexDirection: 'column'}}>
            <Text style={[styles.descriptionW, {fontWeight: '600'}]}>{(prop.ref  &&  prop.ref === constants.TYPES.MONEY ? DEFAULT_CURRENCY_SYMBOL : '') + val + (prop.units &&  prop.units.charAt(0) !== '[' ? ' ' + prop.units : '')}</Text>
          </View>
       </View>
      )
    }

  }

  onChooseProduct(sendForm) {
    if (this.props.isAggregation)
      return
    var modelName = constants.TYPES.MESSAGE
    var model = utils.getModel(modelName).value;
    var isInterface = model.isInterface;
    if (!isInterface)
      return;

    var self = this;
    var currentRoutes = self.props.navigator.getCurrentRoutes();
    var resource = this.props.to
    // if (resource.name === 'Lloyds') {
      var currentRoutes = self.props.navigator.getCurrentRoutes();
      this.props.navigator.push({
        title: 'I need...',
        id: 15,
        component: ProductChooser,
        sceneConfig: Navigator.SceneConfigs.FloatFromBottom,
        backButtonTitle: 'Cancel',
        passProps: {
          resource: resource,
          to: this.props.to,
          returnRoute: currentRoutes[currentRoutes.length - 1],
          products: JSON.parse(this.props.resource.list),
          callback: this.props.callback,
          bankStyle: this.props.bankStyle
        },
        // rightButtonTitle: 'ion|plus',
        // onRightButtonPress: {
        //   id: 4,
        //   title: 'New product',
        //   component: NewResource,
        //   backButtonTitle: 'Back',
        //   titleTextColor: '#7AAAC3',
        //   rightButtonTitle: 'Done',
        //   passProps: {
        //     model: utils.getModel('tradle.NewMessageModel').value,
        //     // callback: this.modelAdded.bind(this)
        //   }
        // }
      });
    }
  isMyMessage() {
    if (this.props.isAggregation)
      return

    var fromHash = utils.getId(this.props.resource.from);
    var me = utils.getMe()
    if (fromHash == me[constants.TYPE] + '_' + me[constants.ROOT_HASH])
      return true;
  }
  formatDocument(model, verification, onPress) {
    var resource = verification.document;
    var self = this;
    var docModel = utils.getModel(resource[constants.TYPE]).value;
    var docModelTitle = docModel.title;
    var idx = docModelTitle.indexOf('Verification');
    var docTitle = idx === -1 ? docModelTitle : docModelTitle.substring(0, idx);

    var msg;
    if (resource.message)
      msg = <View><Text style={styles.description}>{resource.message}</Text></View>
    else {
      var rows = [];
      this.formatDocument1(model, resource, rows);
      msg = <View>{rows}</View>
    }


    var hasPhotos = resource  &&  resource.photos
    var photo = hasPhotos
              ? <Image source={{uri: utils.getImageUri(resource.photos[0].url)}}  style={styles.cellImage} />
              : <View />;
    var headerStyle = {paddingTop: 5, alignSelf: 'center'}
    var header =  <View style={headerStyle}>
                    <Text style={[styles.resourceTitle, {fontSize: 20, color: '#B6C2A7', fontWeight: '600'}]}>{model.title}</Text>
                  </View>
    header = hasPhotos
            ?  <View style={{flexDirection: 'row', marginHorizontal: -7, marginTop: -10, padding: 7, backgroundColor: '#EDF2CE', justifyContent: 'space-between'}}>
                 {photo}
                 {header}
               </View>
            :  <View style={{alignSelf: 'stretch', marginHorizontal: -7, marginTop: -10, padding: 7, backgroundColor: '#EDF2CE'}}>
                 {header}
               </View>


    var orgRow = <View/>
    if (verification.organization) {
      var orgPhoto = verification.organization.photo
                   ? <Image source={{uri: utils.getImageUri(verification.organization.photo)}} style={[styles.orgImage, {marginTop: -5}]} />
                   : <View />
      var shareView = <View style={{flexDirection: 'row', marginLeft: 0, justifyContent: 'space-between', padding: 5, borderRadius: 10, borderWidth: 1, borderColor: '#eeeeee', backgroundColor: '#F0F0EE', opacity: this.props.resource.documentCreated ? 0.3 : 1}}>
                        <Icon style={styles.shareIcon} size={20} name={'android-share-alt'} />
                        <Text style={{color: '#2E3B4E', fontSize: 16, paddingRight: 5, marginTop: 2}}>Share</Text>
                      </View>
      var orgView =   <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10}}>
                         <Text style={[styles.verySmallLetters]}>verified by </Text>
                         <Text style={[styles.verySmallLetters, {color: '#2E3B4E'}]}>{verification.organization.title.length < 30 ? verification.organization.title : verification.organization.title.substring(0, 27) + '..'}</Text>
                      </View>

      if (onPress) {
        if (!this.props.resource.documentCreated)
            <TouchableHighlight underlayColor='transparent' onPress={onPress ? onPress : () =>
                      AlertIOS.alert(
                        'Sharing ' + docTitle + ' verified by ' + verifiedBy,
                        'with ' + orgTitle,
                        [
                          {text: 'Share', onPress: this.props.share.bind(this, verification, this.props.to, this.props.resource)},
                          {text: 'Cancel', onPress: () => console.log('Canceled!')},
                        ]
                    )}>
              {shareView}
            </TouchableHighlight>

      }
      else if (this.props.resource.documentCreated)
          orgRow = <View style={{flexDirection: 'row', marginTop: 10, paddingBottom: 5, justifyContent:'space-between'}}>
                     {shareView}
                    <TouchableHighlight onPress={self.props.onSelect.bind(this, resource, verification)} underlayColor='transparent'>
                      {orgView}
                    </TouchableHighlight>
                  </View>
      else
        orgRow = <View style={{flexDirection: 'row', marginTop: 10, paddingBottom: 5, justifyContent:'space-between'}}>
          <TouchableHighlight underlayColor='transparent' onPress={onPress ? onPress : () =>
                    AlertIOS.alert(
                      'Sharing ' + docTitle + ' verified by ' + verifiedBy,
                      'with ' + orgTitle,
                      [
                        {text: 'Share', onPress: this.props.share.bind(this, verification, this.props.to, this.props.resource)},
                        {text: 'Cancel', onPress: () => console.log('Canceled!')},
                      ]
                  )}>
            {shareView}
          </TouchableHighlight>
          <TouchableHighlight onPress={self.props.onSelect.bind(this, resource, verification)} underlayColor='transparent'>
            {orgView}
          </TouchableHighlight>
        </View>
    }
    var orgTitle = this.props.to[constants.TYPE] === constants.TYPES.ORGANIZATION
                 ? this.props.to.name
                 : (this.props.to.organization ? this.props.to.organization.title : null);
    var verifiedBy = verification.organization ? verification.organization.title : ''
    // var shareRow = this.props.resource.documentCreated
    //           ?  orgRow
    //           :  <TouchableHighlight underlayColor='transparent' onPress={onPress ? onPress : () =>
    //                 AlertIOS.alert(
    //                   'Sharing ' + docTitle + ' verified by ' + verifiedBy,
    //                   'with ' + orgTitle,
    //                   [
    //                     {text: 'Share', onPress: this.props.share.bind(this, verification, this.props.to, this.props.resource)},
    //                     {text: 'Cancel', onPress: () => console.log('Canceled!')},
    //                   ]
    //               )}>
    //              {orgRow}
    //             </TouchableHighlight>
    // var modal = <Modal
    //                animated={false}
    //                transparent={true}
    //                visible={this.state.visible}>
    //                <View style={{backgroundColor: 'rgba(0, 0, 0, 0.5', flex: 1, justifyContent: 'center'}}>
    //                  <Text style={{color: '#ffffff', alignSelf: 'center', fontSize: 24}}>Hello world</Text>
    //                </View>
    //             </Modal>

               // {modal}
    return (
             <View style={{flex: 1, paddingVertical: 5}} key={self.getNextKey()}>
               {header}
               <View style={{flex:1}}>
                 <TouchableHighlight onPress={self.props.onSelect.bind(this, resource, verification)} underlayColor='transparent'>
                   {msg}
                 </TouchableHighlight>
                 {orgRow}
               </View>
             </View>
           );
  }
  // formatDocumentOld(model, verification, onPress) {
  //   var resource = verification.document;
  //   var self = this;
  //   var docModel = utils.getModel(resource[constants.TYPE]).value;
  //   var docModelTitle = docModel.title;
  //   var idx = docModelTitle.indexOf('Verification');
  //   var docTitle = idx === -1 ? docModelTitle : docModelTitle.substring(0, idx);

  //   var msg;
  //   if (resource.message)
  //     msg = <View><Text style={styles.description}>{resource.message}</Text></View>
  //   else {
  //     var rows = [];
  //     this.formatDocument1(model, resource, rows);
  //     msg = <View>{rows}</View>
  //   }
  //   var hasPhotos = resource  &&  resource.photos
  //   var photo = hasPhotos
  //             ? <Image source={{uri: utils.getImageUri(resource.photos[0].url)}}  style={styles.cellImage} />
  //             : <View />;

  //   var orgRow = <View/>
  //   if (verification.organization) {
  //     var orgPhoto = verification.organization.photo
  //                  ? <Image source={{uri: utils.getImageUri(verification.organization.photo)}} style={[styles.orgImage, {marginTop: -5}]} />
  //                  : <View />
  //     var shareView = <View style={{flexDirection: 'row', marginLeft: hasPhotos ? -50 : 0, justifyContent: 'space-between', padding: 5, borderRadius: 10, borderWidth: 1, borderColor: '#eeeeee', backgroundColor: '#F0F0EE', opacity: this.props.resource.documentCreated ? 0.3 : 1}}>
  //                       <Icon style={styles.shareIcon} size={20} name={'android-share-alt'} />
  //                       <Text style={{color: '#2E3B4E', fontSize: 16, paddingRight: 5, marginTop: 2}}>Share</Text>
  //                     </View>
  //     var orgView =   <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10}}>
  //                        <Text style={[styles.verySmallLetters]}>verified by </Text>
  //                        <Text style={[styles.verySmallLetters, {color: '#2E3B4E'}]}>{verification.organization.title.length < 30 ? verification.organization.title : verification.organization.title.substring(0, 27) + '..'}</Text>
  //                     </View>

  //     if (onPress) {
  //       if (!this.props.resource.documentCreated)
  //           <TouchableHighlight underlayColor='transparent' onPress={onPress ? onPress : () =>
  //                     AlertIOS.alert(
  //                       'Sharing ' + docTitle + ' verified by ' + verifiedBy,
  //                       'with ' + orgTitle,
  //                       [
  //                         {text: 'Share', onPress: this.props.share.bind(this, verification, this.props.to, this.props.resource)},
  //                         {text: 'Cancel', onPress: () => console.log('Canceled!')},
  //                       ]
  //                   )}>
  //             {shareView}
  //           </TouchableHighlight>

  //     }
  //     else if (this.props.resource.documentCreated)
  //         orgRow = <View style={{flexDirection: 'row', marginTop: 10, justifyContent:'space-between'}}>
  //                    {shareView}
  //                   <TouchableHighlight onPress={self.props.onSelect.bind(this, resource)} underlayColor='transparent'>
  //                     {orgView}
  //                   </TouchableHighlight>
  //                 </View>
  //     else
  //       orgRow = <View style={{flexDirection: 'row', marginTop: 10, justifyContent:'space-between'}}>
  //         <TouchableHighlight underlayColor='transparent' onPress={onPress ? onPress : () =>
  //                   AlertIOS.alert(
  //                     'Sharing ' + docTitle + ' verified by ' + verifiedBy,
  //                     'with ' + orgTitle,
  //                     [
  //                       {text: 'Share', onPress: this.props.share.bind(this, verification, this.props.to, this.props.resource)},
  //                       {text: 'Cancel', onPress: () => console.log('Canceled!')},
  //                     ]
  //                 )}>
  //           {shareView}
  //         </TouchableHighlight>
  //         <TouchableHighlight onPress={self.props.onSelect.bind(this, resource)} underlayColor='transparent'>
  //           {orgView}
  //         </TouchableHighlight>
  //       </View>
  //   }
  //   var orgTitle = this.props.to[constants.TYPE] === constants.TYPES.ORGANIZATION
  //                ? this.props.to.name
  //                : (this.props.to.organization ? this.props.to.organization.title : null);
  //   var verifiedBy = verification.organization ? verification.organization.title : ''
  //   // var shareRow = this.props.resource.documentCreated
  //   //           ?  orgRow
  //   //           :  <TouchableHighlight underlayColor='transparent' onPress={onPress ? onPress : () =>
  //   //                 AlertIOS.alert(
  //   //                   'Sharing ' + docTitle + ' verified by ' + verifiedBy,
  //   //                   'with ' + orgTitle,
  //   //                   [
  //   //                     {text: 'Share', onPress: this.props.share.bind(this, verification, this.props.to, this.props.resource)},
  //   //                     {text: 'Cancel', onPress: () => console.log('Canceled!')},
  //   //                   ]
  //   //               )}>
  //   //              {orgRow}
  //   //             </TouchableHighlight>

  //   return (
  //            <View style={{flex: 1, flexDirection: 'row', paddingVertical: 5}} key={self.getNextKey()}>
  //              <View>
  //                {photo}
  //              </View>
  //              <View style={{flex:1}}>
  //                <TouchableHighlight onPress={self.props.onSelect.bind(this, resource)} underlayColor='transparent'>
  //                  {msg}
  //                </TouchableHighlight>
  //                {orgRow}
  //              </View>
  //            </View>
  //          );
  // }
  // formatDocumentAccordion(model, verification, onPress) {
  //   var resource = verification.document;
  //   var self = this;
  //   var docModel = utils.getModel(resource[constants.TYPE]).value;
  //   var docModelTitle = docModel.title;
  //   var idx = docModelTitle.indexOf('Verification');
  //   var docTitle = idx === -1 ? docModelTitle : docModelTitle.substring(0, idx);

  //   var msg;
  //   if (resource.message)
  //     msg = <View><Text style={styles.description}>{resource.message}</Text></View>
  //   else {
  //     var rows = [];
  //     this.formatDocument1(model, resource, rows);
  //     var vRows = <View>{rows}</View>
  //     var header = <View style={{paddingTop: 5}}>
  //                   <Text style={[styles.resourceTitle, {fontSize: 18, color: '#CCCCB2'}]}>{model.title}</Text>
  //                 </View>

  //     msg = <View>
  //            <Accordion
  //              header={header}
  //              style={{alignSelf: 'stretch', paddingBottom: 10}}
  //              content={vRows}
  //              underlayColor='transparent'
  //              easing='easeOutQuad' />
  //           </View>
  //   }
  //   var hasPhotos = resource  &&  resource.photos
  //   var photo = hasPhotos
  //             ? <Image source={{uri: utils.getImageUri(resource.photos[0].url)}}  style={styles.cellImage} />
  //             : <View />;

  //   var orgRow = <View/>
  //   if (verification.organization) {
  //     var orgPhoto = verification.organization.photo
  //                  ? <Image source={{uri: utils.getImageUri(verification.organization.photo)}} style={[styles.orgImage, {marginTop: -5}]} />
  //                  : <View />
  //     var shareView = <View style={{flexDirection: 'row', marginLeft: hasPhotos ? -50 : 0, justifyContent: 'space-between', padding: 5, borderRadius: 10, borderWidth: 1, borderColor: '#eeeeee', backgroundColor: '#F0F0EE', opacity: this.props.resource.documentCreated ? 0.3 : 1}}>
  //                       <Icon style={styles.shareIcon} size={20} name={'android-share-alt'} />
  //                       <Text style={{color: '#2E3B4E', fontSize: 16, paddingRight: 5, marginTop: 2}}>Share</Text>
  //                     </View>
  //     var orgView =   <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10}}>
  //                        <Text style={[styles.verySmallLetters]}>verified by </Text>
  //                        <Text style={[styles.verySmallLetters, {color: '#2E3B4E'}]}>{verification.organization.title.length < 30 ? verification.organization.title : verification.organization.title.substring(0, 27) + '..'}</Text>
  //                     </View>

  //     if (onPress) {
  //       if (!this.props.resource.documentCreated)
  //           <TouchableHighlight underlayColor='transparent' onPress={onPress ? onPress : () =>
  //                     AlertIOS.alert(
  //                       'Sharing ' + docTitle + ' verified by ' + verifiedBy,
  //                       'with ' + orgTitle,
  //                       [
  //                         {text: 'Share', onPress: this.props.share.bind(this, verification, this.props.to, this.props.resource)},
  //                         {text: 'Cancel', onPress: () => console.log('Canceled!')},
  //                       ]
  //                   )}>
  //             {shareView}
  //           </TouchableHighlight>

  //     }
  //     else if (this.props.resource.documentCreated)
  //         orgRow = <View style={{flexDirection: 'row', marginTop: 10, justifyContent:'space-between'}}>
  //                    {shareView}
  //                   <TouchableHighlight onPress={self.props.onSelect.bind(this, resource)} underlayColor='transparent'>
  //                     {orgView}
  //                   </TouchableHighlight>
  //                 </View>
  //     else
  //       orgRow = <View style={{flexDirection: 'row', marginTop: 10, justifyContent:'space-between'}}>
  //         <TouchableHighlight underlayColor='transparent' onPress={onPress ? onPress : () =>
  //                   AlertIOS.alert(
  //                     'Sharing ' + docTitle + ' verified by ' + verifiedBy,
  //                     'with ' + orgTitle,
  //                     [
  //                       {text: 'Share', onPress: this.props.share.bind(this, verification, this.props.to, this.props.resource)},
  //                       {text: 'Cancel', onPress: () => console.log('Canceled!')},
  //                     ]
  //                 )}>
  //           {shareView}
  //         </TouchableHighlight>
  //         <TouchableHighlight onPress={self.props.onSelect.bind(this, resource)} underlayColor='transparent'>
  //           {orgView}
  //         </TouchableHighlight>
  //       </View>
  //   }
  //   var orgTitle = this.props.to[constants.TYPE] === constants.TYPES.ORGANIZATION
  //                ? this.props.to.name
  //                : (this.props.to.organization ? this.props.to.organization.title : null);
  //   var verifiedBy = verification.organization ? verification.organization.title : ''
  //   // var shareRow = this.props.resource.documentCreated
  //   //           ?  orgRow
  //   //           :  <TouchableHighlight underlayColor='transparent' onPress={onPress ? onPress : () =>
  //   //                 AlertIOS.alert(
  //   //                   'Sharing ' + docTitle + ' verified by ' + verifiedBy,
  //   //                   'with ' + orgTitle,
  //   //                   [
  //   //                     {text: 'Share', onPress: this.props.share.bind(this, verification, this.props.to, this.props.resource)},
  //   //                     {text: 'Cancel', onPress: () => console.log('Canceled!')},
  //   //                   ]
  //   //               )}>
  //   //              {orgRow}
  //   //             </TouchableHighlight>

  //   return (
  //            <View style={{flex: 1, flexDirection: 'row', paddingVertical: 5}} key={self.getNextKey()}>
  //              <View>
  //                {photo}
  //              </View>
  //              <View style={{flex:1}}>
  //                <TouchableHighlight onPress={self.props.onSelect.bind(this, resource)} underlayColor='transparent'>
  //                  {msg}
  //                </TouchableHighlight>
  //                {orgRow}
  //              </View>
  //            </View>
  //          );
  // }
  formatDocument1(model, resource, renderedRow) {
    var viewCols = model.gridCols || model.viewCols;
    if (!viewCols)
      return
    var verPhoto;
    var vCols = [];
    var self = this;

    if (resource[constants.TYPE] != model.id)
      return;

    var properties = model.properties;
    var noMessage = !resource.message  ||  !resource.message.length;
    var onPressCall;

    var isSimpleMessage = model.id === constants.TYPES.SIMPLE_MESSAGE

    viewCols.forEach(function(v) {
      if (properties[v].type === 'array'  ||  properties[v].type === 'date')
        return;
      var style = styles.verySmallLetters;
      if (properties[v].ref) {
        if (resource[v]) {
          var val
          if (properties[v].type === 'object') {
            if (properties[v].ref) {
              if (properties[v].ref === constants.TYPES.MONEY)
                val = DEFAULT_CURRENCY_SYMBOL + resource[v]
              else {
                var m = utils.getModel(properties[v].ref).value
                if (m.subClassOf  &&  m.subClassOf == 'tradle.Enum')
                  val = resource[v].title
              }
            }
          }
          if (!val)
            val = resource[v].title
          vCols.push(self.getPropRow(properties[v], resource, val, true))
        }
        return;
      }
      var row
      if (resource[v]  &&  properties[v].type === 'string'  &&  (resource[v].indexOf('http://') == 0  ||  resource[v].indexOf('https://') == 0))
        row = <Text style={style} key={self.getNextKey()}>{resource[v]}</Text>;
      else if (!model.autoCreate) {
        var val = (properties[v].displayAs)
                ? utils.templateIt(properties[v], resource)
                : resource[v];
        row = self.getPropRow(properties[v], resource, val || resource[v], true)
      }
      else {
        if (!resource[v]  ||  !resource[v].length)
          return;
        var msgParts = utils.splitMessage(resource[v]);
        // Case when the needed form was sent along with the message
        if (msgParts.length === 2) {
          var msgModel = utils.getModel(msgParts[1]);
          if (msgModel) {
            vCols.push(<View key={self.getNextKey()}>
                         <Text style={style}>{msgParts[0]}</Text>
                         <Text style={[style, {color: isMyMessage ? STRUCTURED_MESSAGE_COLOR : LINK_COLOR}]}>{msgModel.value.title}</Text>
                       </View>);
            return;
          }
        }
        row = self.getPropRow(properties[v], resource, resource[v], /*style,*/ true)
      }
      vCols.push(row);
    });

    if (vCols  &&  vCols.length) {
      vCols.forEach(function(v) {
        renderedRow.push(v);
      });
    }
  }

}

var styles = StyleSheet.create({
  textContainer: {
    flex: 1,
    flexDirection: 'row'
  },
  resourceTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 2,
  },
  date: {
    flex: 1,
    color: '#999999',
    fontSize: 12,
    alignSelf: 'center',
    paddingTop: 10
  },
  row: {
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    flexDirection: 'row',
  },
  myCell: {
    paddingVertical: 5,
    paddingHorizontal: 7,
    justifyContent: 'flex-end',
    borderRadius: 10,
    backgroundColor: '#569bff',
  },
  forgetCell: {
    paddingVertical: 5,
    paddingHorizontal: 7,
    justifyContent: 'flex-end',
    borderRadius: 10,
    backgroundColor: 'red',
  },
  myAdCell: {
    paddingVertical: 5,
    paddingHorizontal: 7,
    justifyContent: 'flex-end',
    // backgroundColor: '#7AAAC3',
  },
  myConfCell: {
    paddingVertical: 5,
    paddingHorizontal: 7,
    justifyContent: 'flex-end',
    borderRadius: 10,
  },
  shareIcon: {
    height: 20,
    color: '#7aaac3',
    width: 20,
  },
  msgImage: {
    backgroundColor: '#dddddd',
    height: 30,
    marginRight: 3,
    marginLeft: 0,
    width: 30,
    borderRadius: 15,
    borderColor: '#cccccc',
    borderWidth: 1
  },
  bigImage: {
    width: 240,
    height: 280,
    margin: 1,
    borderRadius: 10
  },
  bigImageH: {
    width: 270,
    height: 200,
    margin: 1,
    borderRadius: 10
  },
  mediumImage: {
    width: 120,
    height: 120,
    margin: 1,
    borderRadius: 10
  },
  image: {
    width: 88,
    height: 88,
    margin: 1,
    borderRadius: 10
  },
  verySmallLetters: {
    fontSize: 16,
    // alignSelf: 'flex-end',
    color: '#757575'
    // color: '#b4c3cb'
  },
  orgImage: {
    width: 20,
    height: 20,
    borderRadius: 10
  },
  cellRoundImage: {
    paddingVertical: 1,
    borderRadius: 30,
    height: 60,
    width: 60,
    alignSelf: 'center'
  },
  cellText: {
    marginTop: 16,
    alignSelf: 'center',
    color: '#ffffff',
    fontSize: 18,
    backgroundColor: 'transparent'
  },
  cellImage: {
    backgroundColor: '#dddddd',
    height: 40,
    width: 40,
    marginRight: 10,
    borderColor: 'transparent',
    borderRadius:10,
    borderWidth: 1,
  },
  verificationIcon: {
    width: 20,
    height: 20,
    color: '#ffffff',
    // marginRight: -10
  },
  linkIcon: {
    width: 20,
    height: 20,
    color: '#2892C6'
  },
  linkIconGreyed: {
    width: 20,
    height: 20,
    color: '#cccccc'
  },
  description: {
    // flexWrap: 'wrap',
    color: '#757575',
    fontSize: 14,
  },
  descriptionW: {
    // flexWrap: 'wrap',
    color: '#ffffff',
    fontSize: 16,
  },
  assistentText: {
    color: '#757575',
    fontStyle: 'italic',
    fontSize: 16
  },
  assistentBox: {
    backgroundColor: '#efefef',
    paddingVertical: 5,
    borderRadius: 5,
    paddingHorizontal: 7,
    marginTop: -7,
    marginHorizontal: -7
  },
  formType: {
    color: '#EBFCFF',
    fontSize: 20,
    fontWeight: '600',
    opacity: 0.5,
    alignSelf: 'flex-end',
    marginTop: 10
  },
  verifiedHeader: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 7,
    marginHorizontal: -7,
    marginTop: -5,
    justifyContent: 'center'
  },
});
reactMixin(MessageRow.prototype, RowMixin);

module.exports = MessageRow;
