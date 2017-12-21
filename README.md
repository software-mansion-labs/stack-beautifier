# stack-beautifier

Tool for decrypting stack traces coming from the minified JS code.

## wat?

This tool helps with translating minified/uglified stack traces from your production apps (NodeJS/react native/web) into a human readable form (with line number from your original source files) utilising the concept of [source maps](https://github.com/mozilla/source-map). This tool aims at providing a simple way of deminifying stack traces from a command line interface as opposed to other great existing alternatives, which provides similar functionality but require integration into a deployment process.

## Installation

Install it using npm: `npm install -g stack-beautifier`

## Usage

By default the tool accepts source map file as an argument and reads stack trace from the standard input and the prints out the translated stack trace to the standard output. The default behaviour can be altered by using the following command line options:

```
  Usage: stack-beautifier [options] <app.js.map>

  Options:

    -t, --trace [input_file]    Read stack trace from the input file (stdin is used when this option is not set)
    -o, --output [output_file]  Write result into the given output file (stdout is used when this option is not set)
    -l, --long                  Output complete javascript filenames in the stacktrace (tool will try to shorten file paths by default)
```

## Stack trace input format

The tool can understand javascript stack traces that starts with a single line of error message followed by many lines each representing a single stack trace level. The line format has been made compatible with what you can get from most popular JS engines (V8 and JSC used in React-Native). Here are a few examples of stack traces the tool can understand:

### V8 stack trace:

```
TypeError: Assignment to constant variable.
    at <anonymous> (app.bundle.js:34:612)
    at b (app.bundle.js:11:3018)
    at d (app.bundle.js:8:1074)
    at <anonymous> (app.bundle.js:1:5)
```

### JSC (react-native) stack trace:

```
Fatal Exception: com.facebook.react.common.JavascriptException: Invalid attempt to destructure non-iterable instance, stack:
<unknown>@9:487
o@781:121
value@80:1312
value@42:1514
<unknown>@18:912
d@31:10
value@11:1512
```

## Using with React Native

When using react-native, javascript bundle gets created as a part of the release build process (unless you use react-native-code-push or similar tooling). We recommend that you alter that build step to also generate a source map that you can archive somewhere and then use for decrypting stack traces when necessary.

To do so on android you can add the following snippet to your `android/app/build.gradle`:

```groovy
project.ext.react = [
    extraPackagerArgs: ['--sourcemap-output', file("$buildDir/outputs/index.android.js.map")]
]
```

Note that it has to be added before the `apply from: "../../node_modules/react-native/react.gradle"` line. After a successful build the sourcemap will be located under `android/app/build/outputs/index.android.js.map`.

### Generate source map from the application sources

If you don't have access to the source map file there is still hope. You can checkout the version at which the bundle has been generated and run the following command for android:

```bash
react-native bundle --platform android --entry-file index.js --dev false --reset-cache --bundle-output /tmp/bundle.android.js --assets-dest /tmp/ --sourcemap-output index.android.js.map
```

or for iOS:

```bash
react-native bundle --platform ios --entry-file index.js --dev false --reset-cache --bundle-output /tmp/bundle.ios.js --assets-dest /tmp/ --sourcemap-output index.ios.js.map
```

Note that it is crutial that all the dependencies from `node_module` are at the same version as when the JS bundle has been generated, otherwise the source map may not give you the correct mapping. We recommend using [yarn](https://yarnpkg.com/) that helps in ensuring reproducable JS bundle builds.


## Example usage:

In order to use this tool you first need to have access to the source map file associated with the javascript bundle you're getting the stack trace from. Assume that the sourcemap is stored in `app.js.map` file and the stack trace is save in `mytrace.txt` and looks as follows:

```
Fatal Exception: com.facebook.react.common.JavascriptException: Invalid attempt to destructure non-iterable instance, stack:
<unknown>@9:487
o@781:121
value@80:1312
value@42:1514
<unknown>@18:912
d@31:10
value@11:1512
```

Now you can call the following command in order to get the deminified stack trace printed:
```bash
 > stack-beautifier app.js.map -t mytrace.txt
Fatal Exception: com.facebook.react.common.JavascriptException: Invalid attempt to destructure non-iterable instance, stack:
  at arr (./node_modules/react-native/packager/react-packager/src/Resolver/polyfills/babelHelpers.js:227:22)
  at _url$match (./js/launcher/index.js:9:30)
  at _currentSubscription (./node_modules/react-native/Libraries/EventEmitter/EventEmitter.js:185:11)
  at ./node_modules/react-native/Libraries/Utilities/MessageQueue.js:273:27
  at __callImmediates (./node_modules/react-native/Libraries/Utilities/MessageQueue.js:119:11)
  at fn (./node_modules/react-native/Libraries/Utilities/MessageQueue.js:46:4)
  at __callFunction (./node_modules/react-native/Libraries/Utilities/MessageQueue.js:118:20)
```

## Troubleshooting

#### Getting error "Stack trace parse error at line N"

It means that the tool is not able to understand the format of the stacktrace. The tool only supports most common stack traces formats, please check if the stack trace you're trying to input is in one of the supported formats. There is also a chance that your stack trace is in a valid format but your file contain some

#### Still having some issues

Try searching over the issues on GitHub [here](https://github.com/SoftwareMansion/stack-beautifier/issues). If you don't find anything that would help feel free to open new issue!


## Contributing

All PRs are welcome!
