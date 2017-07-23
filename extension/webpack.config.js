var path = require('path');

module.exports = {
    entry: {
        module: './js/module.js',
        timeline: './js/Timeline.js',
        taskchart: './js/TaskChart.js'
    },
    output: {
        path: path.resolve(__dirname, 'sparkmonitor/static'),
        filename: '[name].js',
        // library:'sparkmonitor',
        libraryTarget: 'umd'
    },
    externals: ['jquery', 'require', 'base/js/namespace', 'base/js/events', 'notebook/js/codecell', 'moment'],
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['env'],

                        plugins: [
                            "add-module-exports"
                        ]
                    }

                }
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
            {
                test: /node_modules[\\\/]vis[\\\/].*\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        cacheDirectory: true,
                        presets: ["env"],
                        "babelrc": false,
                        // plugins: [
                        //     "transform-es3-property-literals",
                        //     "transform-es3-member-expression-literals",
                        //     "transform-runtime"
                        // ]

                    }
                }
            },
            // {
            //     test: /node_modules/,
            //     use: {
            //         loader: 'ify-loader',

            //     },
            //     enforce: 'post'
            // }

        ],
    }
};