var DataBind = (function (dataBind) {
    "use strict";

    dataBind.Parser = function(fireValueChangedForAllDependencies, context) {
        var checkWrapArray = function (name, object) {
            return Array.isArray(object)
                ? new DataBind.Collection(name, object, fireValueChangedForAllDependencies)
                : object;
        };

        var checkForStringLiteral = function(name) {
            var stringLiteralRegex = /^['"]([^'"]*)['"]$/;
            return stringLiteralRegex.exec(name);
        };

        var tokenize = function(name) {
            var pieces = name.split('.');
            for(var i = 0; i < pieces.length; i++) {
                var splitArr = pieces[i].indexOf('][');
                if (splitArr >= 0) {
                    var firstPart = pieces[i].substring(0, splitArr + 1);
                    var secondPart = pieces[i].substring(splitArr + 1);

                    pieces.splice(i, 1);
                    pieces.splice(i, 0, firstPart);
                    pieces.splice(i + 1, 0, secondPart);
                }
            }

            return pieces;
        };

        var parseFunctionCall = function (expression, attrs) {
            var args = [];
            var functionName = expression;

            var argsRegex = /[(][^)]*[)]/;
            var match = argsRegex.exec(expression);
            if (match !== null) {
                functionName = expression.substring(0, match.index);

                var commaSeparatedArgs = match[0].replace('(', '').replace(')', '');

                var argPieces = commaSeparatedArgs.length > 0
                    ? commaSeparatedArgs.split(',')
                    : [];

                argPieces.forEach(function (piece) {
                    args.push(get(piece.trim(), undefined, undefined, attrs));
                });
            }

            return {name: functionName, args: args, isMatch: match !== null };
        };

        var getArrayIndexerMatch = function (name) {
            var arrayAccessRegex = /\[([^\]]+)\]/;

            return arrayAccessRegex.exec(name);
        };

        var getIndex = function (capture, attrs) {
            var intRegex = /^\d+$/;

            return intRegex.test(capture)
                ? parseInt(capture)
                : attrs[capture];
        };

        var get = function(name, object, fullName, attrs) {
            fullName = fullName || name;

            if (/^\d+$/.test(name)) {
                return parseInt(name);
            }

            var stringLiteralMatch = checkForStringLiteral(name);
            if (stringLiteralMatch !== null) {
                return stringLiteralMatch[1];
            }

            var dotPieces = tokenize(name);

            var rest = dotPieces.slice(1, dotPieces.length).join('.');

            var parseFuncResult = parseFunctionCall(dotPieces[0], attrs);
            if (!parseFuncResult.isMatch) {
                var arrayIndexer = getArrayIndexerMatch(dotPieces[0]);

                if (arrayIndexer !== null) {
                    var prop = dotPieces[0].substring(0, arrayIndexer.index);
                    var index = getIndex(arrayIndexer[1], attrs);

                    if (object !== undefined) {
                        if (prop === '') {
                            return get.call(context, rest, object[index], fullName, attrs);
                        }
                        return get.call(context, rest, eval('object.' + prop)[index], fullName, attrs);
                    }

                    return get.call(context, rest, attrs[prop][index], fullName, attrs);
                }
            }

            if (object !== undefined) {
                if (dotPieces[0] === '') {
                    return checkWrapArray(fullName, object);
                }

                return get.call(context, rest, eval('object.' + dotPieces[0]), fullName, attrs);
            }

            if (dotPieces.length === 1) {
                if (typeof attrs[parseFuncResult.name] === 'function') {
                    return attrs[parseFuncResult.name].apply(context, parseFuncResult.args);
                }
                return checkWrapArray(name, attrs[name]);
            }

            var thisObject = typeof attrs[parseFuncResult.name] === 'function'
                ? attrs[parseFuncResult.name].apply(context, parseFuncResult.args)
                : attrs[dotPieces[0]];

            return get.call(context, rest, thisObject, fullName, attrs);
        };

        return {
            get: get
        };
    };

    return dataBind;
}(DataBind || {}));
