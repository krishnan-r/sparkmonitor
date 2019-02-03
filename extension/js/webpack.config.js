var path = require('path');

module.exports = {
    mode: 'production',
    entry: {
        module: './notebook/index.tsx',
    },
    output: {
        path: path.resolve(__dirname, '../sparkmonitor/sparkmonitor/static'),
        filename: '[name].js',
        libraryTarget: 'umd'
    },
    externals: [
        'jquery',
        'require',
        'base/js/namespace',
        'base/js/events',
        'notebook/js/codecell',
        'moment'
    ],
    devtool: 'inline-source-map',

    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },

    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/env'],

                        plugins: [
                            "add-module-exports"
                        ]
                    }

                }
            },
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                use: [
                    'file-loader'
                ]
            },
            {
                test: /\.(html)$/,
                use: {
                    loader: 'html-loader',
                    options: {
                        attrs: [':data-src']
                    }
                }
            },
            // {
            //     test: /node_modules[\\\/]vis[\\\/].*\.js$/,
            //     use: {
            //         loader: 'babel-loader',
            //         options: {
            //             cacheDirectory: true,
            //             presets: ["env"],
            //             "babelrc": false,
            //         }
            //     }
            // },

        ],
    }
};
