'use strict'

import React, { PropTypes, Component } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableHighlight,
  StyleSheet,
  Dimensions
} from 'react-native'

import t from 'tcomb-form-native'
import Icon from 'react-native-vector-icons/Ionicons'
import { translate } from '../../utils/utils'
import { makeResponsive } from 'react-native-orient'
// import FloatingLabel from 'react-native-floating-labels'

const Form = t.form.Form
const SetType = t.struct({
  password: t.String,
  passwordAgain: t.String
})

const CheckType = t.struct({
  password: t.String
})

const Modes = {
  set: 'set',
  check: 'check'
}

const ERROR_COLOR = '#a94442'
const NEUTRAL_COLOR = '#888888'

class PasswordEntry extends Component {
  static propTypes = {
    validate: PropTypes.func,
    onSuccess: PropTypes.func,
    onFail: PropTypes.func,
    passwordRequirements: PropTypes.string,
    submitText: PropTypes.string,
    isCorrect: PropTypes.func,
    maxAttempts: PropTypes.number,
    promptSet: PropTypes.string,
    promptCheck: PropTypes.string,
    promptReenter: PropTypes.string,
    promptRetrySet: PropTypes.string,
    promptRetryCheck: PropTypes.string,
    promptInvalidSet: PropTypes.string,
    successMsg: PropTypes.string,
    failMsg: PropTypes.string,
    style: PropTypes.shape({
      container: View.propTypes.style,
      form: View.propTypes.style,
      submit: View.propTypes.style,
      submitText: View.propTypes.style
    }),
    mode: function (mode) {
      return mode in Modes
    }
  };

  constructor(props) {
    super(props)
    this.state = this.props.mode === 'set' ? this._getInitialSetState() : this._getInitialCheckState()
    this.onPress = this.onPress.bind(this)
    this.onChange = this.onChange.bind(this)
  }

  _getInitialSetState() {
    return {
      message: this.props.isChange ? this.props.promptSetChange : this.props.promptSet,
      value: {
        password: '',
        passwordAgain: ''
      },
      errors: {
        password: null,
        passwordAgain: null
      }
    }
  }

  _getInitialCheckState() {
    return {
      message: this.props.isChange ? this.props.promptCheckCurrent : this.props.promptCheck,
      value: {
        password: ''
      },
      attempts: 0
    }
  }

  componentDidMount() {
    var input = this.refs.form.getComponent('password').refs.input
    if (!input.focus) input = input.refs.input
    input.focus()
    input.addEventListener('keydown', e => {
      if (!input.value || this.isDisabled()) return

      const code = e.keyCode ? e.keyCode : e.which
      if (code == 13) { // Enter keycode
        this.onPress()
      }
    })
  }

  onChange(value, path) {
    if (this.props.mode === 'set') {
      this._onChangeSet(...arguments)
    } else {
      this._onChangeCheck(...arguments)
    }
  }

  _onChangeCheck(value, path) {
    this.setState({value})
  }

  _onChangeSet(value, path) {
    this.setState({
      value,
      errors: this.validatePasswordChoice(value, path[0] === 'passwordAgain')
    })
  }

  validatePasswordChoice(value, both) {
    var passwordError = this.props.validate(value && value.password || '')
    if (passwordError === false) passwordError = this.props.promptInvalidSet
    else if (passwordError === true) passwordError = null

    const errors = {
      password: passwordError
    }

    if (!passwordError && both) {
      if (!value || value.password !== value.passwordAgain) {
        errors.passwordAgain = this.props.promptRetrySet
      }
    }

    return errors
  }

  onPress() {
    if (this.isDisabled()) return

    if (this.props.mode === 'set') {
      this._onSet()
    } else {
      this._onCheck()
    }
  }

  _onSet() {
    const errors = this.validatePasswordChoice(this.refs.form.getValue(), true)
    if (errors.password || errors.passwordAgain) {
      this.setState({ errors })
    } else {
      this.props.onSuccess(this.state.value.password)
    }
  }

  _onCheck() {
    const fields = this.refs.form.getValue()
    if (!fields) return

    const password = fields.password
    const result = this.props.isCorrect(password)
    const promise = typeof result === 'boolean' ? Promise.resolve(result) : result
    return promise.then(isCorrect => {
      if (isCorrect) return this.props.onSuccess(password)

      const attempts = this.state.attempts + 1
      this.setState({
        attempts
      }, () => {
        if (attempts >= this.props.maxAttempts) {
          return this.props.onFail()
        }
      })
    })
  }

  isDisabled() {
    return this.props.mode === 'check' && this.state.attempts >= this.props.maxAttempts
  }

  hasError() {
    return this.props.mode === 'set'
      ? !!(this.state.errors.password || this.state.errors.passwordAgain)
      : this.state.attempts > 0
  }

  _getOptions() {
    return this.props.mode === 'set' ? this._getSetOptions() : this._getCheckOptions()
  }

  _getSetOptions() {
    return {
      auto: 'placeholders',
      fields: {
        password: {
          placeholder: 'Password',
          password: true,
          secureTextEntry: true,
          error: this.state.errors.password,
          hasError: !!this.state.errors.password,
          help: this.props.passwordRequirements
        },
        passwordAgain: {
          placeholder: 'Re-enter password',
          password: true,
          secureTextEntry: true,
          hasError: !!this.state.errors.passwordAgain,
          error: this.state.errors.passwordAgain
        }
      },
      order: ['password', 'passwordAgain']
    }
  }

  _getCheckOptions() {
    return {
      auto: 'placeholders',
      fields: {
        password: {
          password: true,
          secureTextEntry: true,
          hasError: this.state.attempts > 0,
          help: this.props.passwordRequirements
        }
      }
    }
  }

  render() {
    const options = this._getOptions()
    const disabled = this.isDisabled()
    if (disabled) {
      t.update(options, {
        fields: {
          password: {
            editable: {'$set': false}
          }
        }
      })
    }

    const customStyle = this.props.style || {}
    const type = this.props.mode === 'set' ? SetType : CheckType
    const header = this.renderHeader()
    let { width, height } = Dimensions.get('window')
    const smaller = Math.min(width, height)
    width = smaller / 2
    height = smaller / 4
    return (
      <View style={[styles.container, customStyle.container]}>
        {header}
        <View style={{ width, height }}>
          <Form
            ref="form"
            type={type}
            options={options}
            style={[styles.form, customStyle.form]}
            value={this.state.value}
            onChange={this.onChange}
          />
          <TouchableHighlight
            style={[styles.button, customStyle.submit, { alignItems: 'center' }]}
            onPress={this.onPress}
            underlayColor='transparent'
            disabled={disabled}>
            <Icon
              name='ios-lock'
              size={this.props.iconSize || 100}
              style={{color: this.hasError() ? ERROR_COLOR : NEUTRAL_COLOR }}
            />
          </TouchableHighlight>
        </View>
      </View>
    )
  }

  renderHeader() {
    const style = this.hasError() ? styles.error : styles.prompt
    return (
      <Text style={[styles.header, style]}>{this.state.message}</Text>
    )
  }
  // <Text style={[styles.buttonText, customStyle.submitText]}>{this.props.submitText || 'Save'}</Text>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#efefef',
    // backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  form: {
    alignSelf: 'stretch',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    fontSize: 25,
    padding: 50,
    textAlign: 'center'
  },
  error: {
    color: ERROR_COLOR
  },
  prompt: {
    color: NEUTRAL_COLOR
  }
  // buttonText: {
  //   fontSize: 18,
  //   color: '#ffffff',
  //   alignSelf: 'center'
  // },
  // button: {
  //   // height: 36,
  //   // backgroundColor: '#48BBEC',
  //   // borderColor: '#48BBEC',
  //   // borderWidth: 1,
  //   // borderRadius: 8,
  //   // marginBottom: 10,
  //   // alignSelf: 'stretch',
  //   justifyContent: 'center'
  // }
})

exports = module.exports = makeResponsive(PasswordEntry)
exports.Modes = Modes
