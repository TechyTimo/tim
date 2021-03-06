console.log('requiring HomePageMixin.js')
'use strict';

import React from 'react'
import _ from 'lodash'

import utils, { translate } from '../utils/utils'
import constants from '@tradle/constants'
import QRCodeScanner from './QRCodeScanner'
import Actions from '../Actions/Actions'
import ResourceList from './ResourceList'
import defaultBankStyle from '../styles/defaultBankStyle.json'
import MessageList from './MessageList'
import ResourceView from './ResourceView'
import NewResource from './NewResource'
import TourPage from './TourPage'
import SplashPage from './SplashPage'
import GridHeader from './GridHeader'
import qrCodeDecoder from '@tradle/qr-schema'
import {
  Alert,
  StatusBar
} from 'react-native'

const debug = require('debug')('tradle:app:HomePageMixin')
const {
  TYPE
} = constants
const {
  PROFILE,
  ORGANIZATION,
  MESSAGE
} = constants.TYPES

const DATA_CLAIM = 'tradle.DataClaim'
const APPLICATION = 'tradle.Application'

var HomePageMixin = {
  scanFormsQRCode(isView) {
    this.setState({hideMode: false})
    this.props.navigator.push({
      title: 'Scan QR Code',
      id: 16,
      component: QRCodeScanner,
      titleTintColor: '#eeeeee',
      backButtonTitle: 'Cancel',
      // rightButtonTitle: 'ion|ios-reverse-camera',
      passProps: {
        onread: this.onread.bind(this, isView)
      }
    })
  },

  onUnknownQRCode() {
    Alert.alert(
      translate('error'),
      translate('unknownQRCodeFormat')
    )

    this.props.navigator.pop()
  },

  async onread(isView, result) {
    try {
      result = qrCodeDecoder.fromHex(result.data)
    } catch (err) {
      debug('failed to parse qrcode', result.data)
      this.onUnknownQRCode()
      return
    }

    const { schema, data } = result
    // post to server request for the forms that were filled on the web
    let me = utils.getMe()
    switch (schema) {
    case 'ImportData':
      let r = {
        _t: 'tradle.DataClaim',
        claimId: data.dataHash,
        from: {
          id: utils.getId(me),
          title: utils.getDisplayName(me)
        },
        to: {
          id: utils.makeId(PROFILE, data.provider)
        }
      }
      Actions.addChatItem({
        resource: r,
        value: r,
        provider: {
          url: data.host,
          hash: data.provider
        },
        meta: utils.getModel(DATA_CLAIM),
        disableAutoResponse: true})
      break
    // case TALK_TO_EMPLOYEEE:
    //   Actions.getEmployeeInfo(data.substring(code.length + 1))
    //   break
    case 'AddProvider':
      Actions.addApp({ url: data.host, permalink: data.provider })
      break
    case 'ApplyForProduct':
      Actions.applyForProduct(data)
      break
    default:
      // keep scanning
      this.onUnknownQRCode()
      break
    }
  },
  mergeStyle(newStyle) {
    let style = {}
    _.extend(style, defaultBankStyle)
    return newStyle ? _.extend(style, newStyle) : style
  },
  showChat(params) {
    if (!params.to)
      return
    let style = this.mergeStyle(params.to.style)

    var route = {
      title: params.to.name,
      component: MessageList,
      id: 11,
      backButtonTitle: 'Back',
      passProps: {
        resource: params.to,
        filter: '',
        modelName: MESSAGE,
        noLoadingIndicator: true,
        currency: params.to.currency,
        bankStyle:  style,
        dictionary: params.dictionary,
      }
    }
    // this.props.navigator.push(route)
    this.props.navigator.replace(route)
  },
  showBanks() {
    this.props.navigator.push({
      title: translate('officialAccounts'),
      id: 10,
      component: ResourceList,
      backButtonTitle: 'Back',
      titleTextColor: '#7AAAC3',
      passProps: {
        officialAccounts: true,
        serverOffline: this.state.serverOffline,
        bankStyle: this.props.bankStyle,
        modelName: ORGANIZATION
      }
    })
  },
  showTourOrSplash({resource, showProfile, termsAccepted, action, callback, style}) {
    let { navigator, bankStyle } = this.props
    if (resource._tour  &&  !resource._noTour) {
      StatusBar.setHidden(true)
      navigator.push({
        title: "",
        component: TourPage,
        id: 35,
        backButtonTitle: null,
        // backButtonTitle: __DEV__ ? 'Back' : null,
        passProps: {
          bankStyle: style || bankStyle,
          noTransitions: true,
          tour: resource._tour,
          callback: () => {
            resource._noTour = true
            resource._noSplash = true
            Actions.addItem({resource: resource})
            // resource._noSplash = true
            callback({resource, termsAccepted, action: 'replace', showProfile})
          }
        }
      })
      return true
    }
    if (resource._noSplash)
      return
    StatusBar.setHidden(true)
    let splashscreen = resource.style  &&  resource.style.splashscreen
    if (!splashscreen)
      return
    let resolvePromise
    let promise = new Promise(resolve => {
      navigator.push({
        title: "",
        component: SplashPage,
        id: 36,
        backButtonTitle: null,
        passProps: {
          splashscreen: splashscreen
        }
      })
      resolvePromise = resolve
    })
    // return
    setTimeout(() => {
      resolvePromise()
      resource._noSplash = true
      Actions.addItem({resource: resource})
      callback({resource, termsAccepted, action: 'replace', showProfile})
    }, 2000)
    return true
  },
  showProfile(navigator, action, importingData) {
    if (importingData) {
      // this.props.navigator.pop()
      // this.props.navigator.pop()
      let len = navigator.getCurrentRoutes().length
      navigator.popN(len - 2)
      return
    }
    let me = utils.getMe()
    let title = translate('profile')
    let m = utils.getModel(me[TYPE])

    navigator[action || 'push']({
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
          model: m,
          resource: me,
          bankStyle: defaultBankStyle
        }
      },
      passProps: {
        resource: me,
        backlink: m.properties.myForms,
        bankStyle: defaultBankStyle
      }
    })
  },

  renderGridHeader() {
    let { modelName, navigator, multiChooser } = this.props
    if (modelName === APPLICATION)
      return <View/>
    let model = utils.getModel(modelName)
    let props = model.properties
    let gridCols = this.getGridCols() // model.gridCols || model.viewCols;
    if (gridCols)
    return (
      // <GridHeader gridCols={gridCols} modelName={modelName} navigator={navigator} />
      <GridHeader gridCols={gridCols} multiChooser={multiChooser} checkAll={multiChooser  &&  this.checkAll.bind(this)} modelName={modelName} navigator={navigator} sort={this.sort.bind(this)}/>
    )
  },
  getGridCols() {
    let model = utils.getModel(this.props.modelName)
    let props = model.properties
    let gridCols = model.gridCols || model.viewCols
    if (!gridCols)
      return
    let vCols = []
    gridCols.forEach((v) => {
      if (/*!props[v].readOnly &&*/ !props[v].list  &&  props[v].range !== 'json')
        vCols.push(v)
    })
    // if (vCols.length === 7)
    //   vCols.splice(6, 1)
    return vCols
  },
  checkAll() {
    let chosen = {}
    let check = utils.isEmpty(this.state.chosen)
    if (check  &&  this.props.list)
      this.props.list.forEach((r) => {
        chosen[utils.getId(r)] = r
      })
    this.setState({chosen: chosen})
  },
  sort(prop) {
    let order = this.state.order || {}
    let curOrder = order[prop]

    order[prop] = curOrder ? false : true
    this.setState({order: order, sortProperty: prop, list: []})

    let params = { modelName: this.props.modelName, sortProperty: prop, asc: order[prop]}
    if (this.props.search)
      _.extend(params, {search: true, filterResource: this.state.resource, limit: this.limit, first: true})
    Actions.list(params)
  }
}

module.exports = HomePageMixin;
