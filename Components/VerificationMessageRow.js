'use strict';

var utils = require('../utils/utils');
var translate = utils.translate
var ArticleView = require('./ArticleView');
var MessageView = require('./MessageView');
var NewResource = require('./NewResource');
var Icon = require('react-native-vector-icons/Ionicons');
var constants = require('@tradle/constants');
var RowMixin = require('./RowMixin');
var equal = require('deep-equal')
import { makeResponsive } from 'react-native-orient'
var StyleSheet = require('../StyleSheet')

var reactMixin = require('react-mixin');

import {
  Image,
  // StyleSheet,
  Text,
  TouchableHighlight,
  Alert,
  Modal,
  Navigator,
  View,
  processColor
} from 'react-native'

import React, { Component } from 'react'

class VerificationMessageRow extends Component {
  constructor(props) {
    super(props);
    var resource = this.props.resource;
    var model = utils.getModel(resource[constants.TYPE] || resource.id).value;
    var me = utils.getMe();
  }
  shouldComponentUpdate(nextProps, nextState) {
    return !equal(this.props.resource, nextProps.resource) ||
           !equal(this.props.to, nextProps.to)             ||
           this.props.orientation != nextProps.orientation ||
           this.props.sendStatus !== nextProps.sendStatus
  }
  render() {
    var resource = this.props.resource;
    var model = utils.getModel(resource[constants.TYPE]).value;
    var renderedRow = [];

    var time = this.getTime(resource);
    var date = time
             ? <Text style={styles.date} numberOfLines={1}>{time}</Text>
             : <View />;

    var isMyMessage = this.isMyMessage();
    var w = utils.dimensions(VerificationMessageRow).width
    let msgWidth = Math.floor((w - 300) * 0.8)
    var viewStyle = {width: msgWidth, flexDirection: 'row', alignSelf: isMyMessage ? 'flex-end' : 'flex-start'};

    var msgModel = utils.getModel(resource.document[constants.TYPE]).value;
    var orgName = resource._verifiedBy
                ? resource._verifiedBy.title
                : resource.organization  ? resource.organization.title : ''

    let me = utils.getMe()
    let isThirdPartyVerification
    if (me.isEmployee  &&  !this.props.to.organization && !this.props.context._readOnly)
      // Check if I am the employee of the organization I opened a chat with or the customer
      isThirdPartyVerification = resource._verifiedBy || (resource.organization  &&  !utils.isEmployee(resource.organization))

    let isShared = this.isShared()
    isMyMessage = isShared
    let bgColor
    if (isThirdPartyVerification)
      bgColor = '#93BEBA'
    else if (isShared)
      bgColor = this.props.bankStyle.SHARED_WITH_BG
    else
      bgColor = this.props.bankStyle.VERIFIED_HEADER_COLOR
    let verifiedBy = isShared ? translate('youShared', orgName) : translate('verifiedBy', orgName)
    let numberOfCharacters = msgWidth / 12
    if (verifiedBy.length > numberOfCharacters)
      verifiedBy = verifiedBy.substring(0, numberOfCharacters) + '..'

    let headerStyle = [
      styles.verifiedHeader,
      {backgroundColor: bgColor}, // opacity: isShared ? 0.5 : 1},
      isMyMessage ? {borderTopRightRadius: 0, borderTopLeftRadius: 10} : {borderTopLeftRadius: 0, borderTopRightRadius: 10}
    ]

    renderedRow = <View>
                    <View style={headerStyle}>
                      {isShared
                       ? <View/>
                       : <Icon style={styles.verificationIcon} size={20} name={'md-checkmark'} />
                      }
                      <Text style={styles.verificationHeaderText}>{isShared ? translate(msgModel) : verifiedBy}</Text>
                    </View>
                    <View>
                      {
                        this.formatDocument({
                          model: msgModel,
                          verification: resource,
                          onPress: this.verify.bind(this),
                          isAccordion: isThirdPartyVerification
                        })
                      }
                    </View>
                  </View>

    var viewStyle = {
      width: msgWidth,
      flexDirection: 'row',
      alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
      backgroundColor: this.props.bankStyle.BACKGROUND_COLOR
    }
    let addStyle = [
      styles.verificationBody,
      {backgroundColor: isShared ? '#ffffff' : this.props.bankStyle.VERIFICATION_BG, borderColor: bgColor},
      isMyMessage ? {borderTopRightRadius: 0} : {borderTopLeftRadius: 0}
    ];
    let messageBody =
          <TouchableHighlight onPress={this.verify.bind(this, resource)} underlayColor='transparent'>
          <View style={{flexDirection: 'column', flex: 1}}>
            <View style={[styles.row, viewStyle]}>
              {this.getOwnerPhoto(isMyMessage)}
              <View style={[styles.textContainer, addStyle]}>
                <View style={{flex: 1}}>
                  {renderedRow}
               </View>
            </View>
          </View>
              {this.getSendStatus()}
            </View>
          </TouchableHighlight>

    var viewStyle = { margin: 1, paddingRight: 10, backgroundColor: this.props.bankStyle.BACKGROUND_COLOR }
    return (
      <View style={viewStyle} key={this.getNextKey()}>
        {date}
        {messageBody}
      </View>
    );
  }
  verify(event) {
    var resource = this.props.resource;
    var isVerification = resource[constants.TYPE] === constants.TYPES.VERIFICATION;
    var r = isVerification ? resource.document : resource

    var passProps = {
      resource: r,
      bankStyle: this.props.bankStyle,
      currency: this.props.currency
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
      title: translate(model)
    }
    if (this.isMyMessage()) {
      route.rightButtonTitle = translate('edit');
      route.onRightButtonPress = {
        title: translate('edit'),
        component: NewResource,
        // titleTextColor: '#7AAAC3',
        id: 4,
        passProps: {
          resource: r,
          metadata: model,
          bankStyle: this.props.bankStyle,
          currency: this.props.currency,
          callback: this.props.onSelect.bind(this, r)
        }
      };
    }
    this.props.navigator.push(route);
  }
}

var styles = StyleSheet.create({
  textContainer: {
    flex: 1,
    flexDirection: 'row'
  },
  date: {
    flex: 1,
    color: '#999999',
    fontSize: 12,
    alignSelf: 'center',
    paddingTop: 10
  },
  row: {
    // alignItems: 'center',
    backgroundColor: '#f7f7f7',
    flexDirection: 'row',
  },
  verifiedHeader: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 7,
    marginHorizontal: -8,
    marginTop: -6,
    justifyContent: 'center'
  },
  verificationHeaderText: {
    fontSize: 18,
    fontWeight: '500',
    alignSelf: 'center',
    color: '#FBFFE5',
    paddingLeft: 3
  },
  verificationBody: {
    paddingTop: 5,
    paddingHorizontal: 7,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginVertical: 2
  },
  verificationIcon: {
    width: 20,
    height: 20,
    color: '#ffffff',
  },
});
reactMixin(VerificationMessageRow.prototype, RowMixin);
VerificationMessageRow = makeResponsive(VerificationMessageRow)

module.exports = VerificationMessageRow;

