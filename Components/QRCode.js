import {
  StyleSheet,
  View,
  ActivityIndicatorIOS,
  InteractionManager
} from 'react-native'

var extend = require('xtend')
var QRCode = require('react-native-barcode/QR/QRCode')
var DEFAULT_DIM = 370

import React, { Component, PropTypes } from 'react'

class QRCodeView extends Component {
  constructor(props) {
    super(props)

    this.state = {
      style: getStyle(this.props.dimension || DEFAULT_DIM),
      renderPlaceholderOnly: true
    }
  }
  propTypes: {
    content: PropTypes.string.isRequired,
    dimension: PropTypes.number,
    fullScreen: PropTypes.bool
  };
  componentDidMount() {
    InteractionManager.runAfterInteractions(() => {
      this.setState({
        renderPlaceholderOnly: false
      });
    });
  }
  render() {
    var code
    if (this.state.renderPlaceholderOnly) {
      return <ActivityIndicatorIOS hidden='true' size='large' style={this.state.style} />
    }

    var code = <QRCode content={this.props.content} style={this.state.style} />
    if (!this.props.fullScreen) return code

    return (
      <View style={styles.container}>
        {code}
      </View>
    )
  }
}

function getStyle (dim) {
  return {
    alignSelf: 'center',
    height: dim,
    width: dim
  }
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent'
  }
})

module.exports = QRCodeView
