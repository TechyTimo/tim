package io.tradle.dev;

import android.app.Application;

import com.BV.LinearGradient.LinearGradientPackage;
import com.babisoft.ReactNativeLocalization.ReactNativeLocalizationPackage;
import com.bitgo.randombytes.RandomBytesPackage;
import com.brentvatne.react.ReactVideoPackage;
import com.dieam.reactnativepushnotification.ReactNativePushNotificationPackage;
import com.facebook.react.ReactApplication;
import com.peel.react.rnos.RNOSModule;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.github.yamill.orientation.OrientationPackage;
import com.imagepicker.ImagePickerPackage;
import com.learnium.RNDeviceInfo.RNDeviceInfo;
import com.lwansbrough.RCTCamera.RCTCameraPackage;
import com.microsoft.codepush.react.CodePush;
import com.oblador.keychain.KeychainPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.rn.ecc.ECCPackage;
import com.rnfs.RNFSPackage;
import com.tradle.react.UdpSocketsModule;

import java.util.Arrays;
import java.util.List;

import io.tradle.react.LocalAuthPackage;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    protected String getJSBundleFile() {
        return CodePush.getJSBundleFile("main.jsbundle");
    }

    @Override
    protected boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
        new MainReactPackage(),
        new RNOSModule(),
        new ReactNativePushNotificationPackage(),
        new RNDeviceInfo(),
        new RNFSPackage(),
        new ImagePickerPackage(),
        new RandomBytesPackage(),
        new KeychainPackage(),
        new ReactVideoPackage(),
        new VectorIconsPackage(),
        new UdpSocketsModule(),
        new ReactNativeLocalizationPackage(),
        new LinearGradientPackage(),
        new CodePush(BuildConfig.CODEPUSH_KEY, MainApplication.this, BuildConfig.DEBUG),
        new RCTCameraPackage(),
        new OrientationPackage(),
        new ECCPackage(),
        new LocalAuthPackage()
      );
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
      return mReactNativeHost;
  }
}
