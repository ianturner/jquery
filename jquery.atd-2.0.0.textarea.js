// ********************************************************************************
// jquery.atd-2.0.0.textarea.js
// jQuery plugin for After The Deadline 
// v2.0 3rd April 2012
// Based on the original jQuery version at https://github.com/Automattic/atd-jquery
// Ian Turner (https://github.com/ianturner)
// see https://groups.google.com/forum/?hl=en#!forum/atd-developers
// ********************************************************************************

AtDCore = {
    // ***************************
    // *** internal properties ***
    // ***************************
    ignore_types: [
        'Bias Language', 
        'Cliches', 
        'Complex Expression', 
        'Diacritical Marks', 
        'Double Negatives', 
        'Hidden Verbs', 
        'Jargon Language', 
        'Passive voice', 
        'Phrases to Avoid', 
        'Redundant Expression'
    ],
    ignore_strings: {}, // a list of words to be ignored - "ignored_words" would be a better name
    suggestions: [], // a list of spelling/grammar suggestions
    
    // ****************************
    // *** localization support ***
    // ****************************
    i18n: {},
    addI18n: function (localizations) {
        this.i18n = localizations;
    },

    showTypes: function (string) {
        var show_types = string.split(/,\s*/g);
        var types = {};
        types["Double Negatives"] = 1;
        types["Hidden Verbs"] = 1;
        types["Passive voice"] = 1;
        types["Bias Language"] = 1;
        types["Cliches"] = 1;
        types["Complex Expression"] = 1;
        types["Diacritical Marks"] = 1;
        types["Jargon Language"] = 1;
        types["Phrases to Avoid"] = 1;
        types["Redundant Expression"] = 1;
        var ignore_types = [];
        this._map(show_types, function (string) {
            types[string] = undefined;
        });
        this._map(this.ignore_types, function (string) {
            if (types[string] != undefined) ignore_types.push(string);
        });
        this.ignore_types = ignore_types;
    },

    // ******************************
    // *** private helper methods ***
    // ******************************
    _hasClass: function (node, className) {
        return $(node).hasClass(className);
    },
    _contents: function (node) {
        return $(node).contents();
    },
    _replaceWith: function (old_node, new_node) {
        return $(old_node).replaceWith(new_node);
    },
    _map: function (array, callback) {
        return jQuery.map(array, callback);
    },

    
    // ***********************
    // *** private methods ***
    // ***********************
    
    // _makeError:
    // class: error management
    // called by: buildErrorStructure.addToErrorStructure
    _makeError: function(error_s, tokens, type, seps, pre) {
        var struct = new Object();
        struct.type = type;
        struct.string = error_s;
        struct.tokens = tokens;
        if (new RegExp("\\b" + error_s + "\\b").test(error_s)) {
            struct.regexp = new RegExp("(?!" + error_s + "<)\\b" + error_s.replace(/\s+/g, seps) + "\\b");
        } else if (new RegExp(error_s + "\\b").test(error_s)) {
            struct.regexp = new RegExp("(?!" + error_s + "<)" + error_s.replace(/\s+/g, seps) + "\\b");
        } else if (new RegExp("\\b" + error_s).test(error_s)) {
            struct.regexp = new RegExp("(?!" + error_s + "<)\\b" + error_s.replace(/\s+/g, seps));
        } else {
            struct.regexp = new RegExp("(?!" + error_s + "<)" + error_s.replace(/\s+/g, seps));
        }
        struct.used = false;
        return struct;
    },
    
    // buildErrorStructure:
    // class: error management
    // called by: processXML
    buildErrorStructure: function (spellingList, enrichmentList, grammarList) {
        function addToErrorStructure(errors, list, type, seps) {
            $.AtD.core._map(list, function (error) {
                var tokens = error["word"].split(/\s+/);
                var pre = error["pre"];
                var first = tokens[0];
                if (errors['__' + first] == undefined) {
                    errors['__' + first] = new Object();
                    errors['__' + first].pretoks = {};
                    errors['__' + first].defaults = new Array();
                }
                if (pre == "") {
                    errors['__' + first].defaults.push($.AtD.core._makeError(error["word"], tokens, type, seps, pre));
                } else {
                    if (errors['__' + first].pretoks['__' + pre] == undefined) errors['__' + first].pretoks['__' + pre] = new Array();
                    errors['__' + first].pretoks['__' + pre].push($.AtD.core._makeError(error["word"], tokens, type, seps, pre));
                }
            });
        };

        var seps = this._getSeparators();
        var errors = {};
        addToErrorStructure(errors, spellingList, "hiddenSpellError", seps);
        addToErrorStructure(errors, grammarList, "hiddenGrammarError", seps);
        addToErrorStructure(errors, enrichmentList, "hiddenSuggestion", seps);
        return errors;
    },
    
    // getSeparators: 
    // class: error management
    // called by: buildErrorStructure, processXML
    _getSeparators: function () {
        var re = '', i;
        var str = '"s!#$%&()*+,./:;<=>?@[\]^_{|}';
        for (i = 0; i < str.length; i++)
            re += '\\' + str.charAt(i);
        return "(?:(?:[\xa0" + re + "])|(?:\\-\\-))+";
    },

    // _create:
    // called by: markMyWords, applySuggestion
    _create: function (node_html, isTextNode) {
        return $('<span class="mceItemHidden">' + node_html + '</span>');
    },

    // _getAttrib:
    // called by: removeWords.isEmptySpan, findSuggestion
    _getAttrib: function (node, name) {
        if (jQuery.browser.msie === true) { // IAT - big fix, was $j.browser.msie
            return node.getAttribute(name);
        } else {
            return $(node).attr(name);
        }
    },

    
    // *******************
    // *** AtDCore API ***
    // *******************
    getLang: function (key, defaultk) {
        if (this.i18n[key] == undefined) 
        {
            return defaultk;
        }
        return this.i18n[key];
    },
    processXML: function (responseXML) {
        var types = {};
        this._map(this.ignore_types, function (type) {
            types[type] = 1;
        });
        this.suggestions = []; // re-initialise suggestions
        var errors = responseXML.getElementsByTagName('error');
        var grammarErrors = [];
        var spellingErrors = [];
        var enrichment = [];
        for (var i = 0; i < errors.length; i++) {
            if (errors[i].getElementsByTagName('string').item(0).firstChild != null) {
                var errorString = errors[i].getElementsByTagName('string').item(0).firstChild.data;
                var errorType = errors[i].getElementsByTagName('type').item(0).firstChild.data;
                var errorDescription = errors[i].getElementsByTagName('description').item(0).firstChild.data;
                var errorContext;
                if (errors[i].getElementsByTagName('precontext').item(0).firstChild != null) errorContext = errors[i].getElementsByTagName('precontext').item(0).firstChild.data;
                else errorContext = "";
                if (this.ignore_strings[errorString] == undefined) {
                    var suggestion = {};
                    suggestion["description"] = errorDescription;
                    suggestion["suggestions"] = [];
                    suggestion["matcher"] = new RegExp('^' + errorString.replace(/\s+/, this._getSeparators()) + '$');
                    suggestion["context"] = errorContext;
                    suggestion["string"] = errorString;
                    suggestion["type"] = errorType;
                    this.suggestions.push(suggestion);
                    if (errors[i].getElementsByTagName('suggestions').item(0) != undefined) {
                        var suggestions = errors[i].getElementsByTagName('suggestions').item(0).getElementsByTagName('option');
                        for (var j = 0; j < suggestions.length; j++)
                            suggestion["suggestions"].push(suggestions[j].firstChild.data);
                    }
                    if (errors[i].getElementsByTagName('url').item(0) != undefined) {
                        var errorUrl = errors[i].getElementsByTagName('url').item(0).firstChild.data;
                        suggestion["moreinfo"] = errorUrl + '&theme=tinymce';
                    }
                    if (types[errorDescription] == undefined) {
                        if (errorType == "suggestion") enrichment.push({
                            word: errorString,
                            pre: errorContext
                        });
                        if (errorType == "grammar") grammarErrors.push({
                            word: errorString,
                            pre: errorContext
                        });
                    }
                    if (errorType == "spelling" || errorDescription == "Homophone") spellingErrors.push({
                        word: errorString,
                        pre: errorContext
                    });
                    if (errorDescription == 'Cliches') suggestion["description"] = 'Clich&eacute;s';
                    if (errorDescription == "Spelling") suggestion["description"] = this.getLang('menu_title_spelling', 'Spelling');
                    if (errorDescription == "Repeated Word") suggestion["description"] = this.getLang('menu_title_repeated_word', 'Repeated Word');
                    if (errorDescription == "Did you mean...") suggestion["description"] = this.getLang('menu_title_confused_word', 'Did you mean...');
                }
            }
        }
        var errorStruct;
        var ecount = spellingErrors.length + grammarErrors.length + enrichment.length;
        if (ecount > 0) errorStruct = this.buildErrorStructure(spellingErrors, enrichment, grammarErrors);
        else errorStruct = undefined;
        return {
            errors: errorStruct,
            count: ecount,
            suggestions: this.suggestions
        };
    },
    hasErrorMessage: function (xmlr) {
        return (xmlr != undefined && xmlr.getElementsByTagName('message').item(0) != null);
    },
    getErrorMessage: function (xmlr) {
        return xmlr.getElementsByTagName('message').item(0);
    },
    markMyWords: function (container_nodes, errors) {
        function walk(elements, f) {
            var i;
            for (i = 0; i < elements.length; i++) {
                f.call(f, elements[i]);
                walk($.AtD.core._contents(elements[i]), f);
            }
        };
        function isIE() {
            return navigator.appName == 'Microsoft Internet Explorer';
        };
        function tokenIterator(tokens) {
            this.tokens = tokens;
            this.index = 0;
            this.count = 0;
            this.last = 0;

            this.next = function () {
                var current = this.tokens[this.index];
                this.count = this.last;
                this.last += current.length + 1;
                this.index++;
                if (current != "") {
                    if (current[0] == "'") current = current.substring(1, current.length);
                    if (current[current.length - 1] == "'") current = current.substring(0, current.length - 1);
                }
                return current;
            };
            this.hasNext = function () {
                return this.index < this.tokens.length;
            };
            this.hasNextN = function (n) {
                return (this.index + n) < this.tokens.length;
            };
            this.skip = function (m, n) {
                this.index += m;
                this.last += n;
                if (this.index < this.tokens.length) this.count = this.last - this.tokens[this.index].length;
            };
            this.getCount = function () {
                return this.count;
            };
            this.peek = function (n) {
                var peepers = new Array();
                var end = this.index + n;
                for (var x = this.index; x < end; x++)
                    peepers.push(this.tokens[x]);
                return peepers;
            };
        };

        var seps = new RegExp(this._getSeparators());
        var nl = new Array();
        var ecount = 0;
        var parent = this;
        walk(container_nodes, function (n) {
            if (n.nodeType == 3 && !parent.isMarkedNode(n)) nl.push(n);
        });
        var iterator;
        this._map(nl, function (n) {
            var v;
            if (n.nodeType == 3) {
                v = n.nodeValue;
                var tokens = n.nodeValue.split(seps);
                var previous = "";
                var doReplaces = [];
                iterator = new tokenIterator(tokens);
                while (iterator.hasNext()) {
                    var token = iterator.next();
                    var current = errors['__' + token];
                    var defaults;
                    if (current != undefined && current.pretoks != undefined) {
                        defaults = current.defaults;
                        current = current.pretoks['__' + previous];
                        var done = false;
                        var prev, curr;
                        prev = v.substr(0, iterator.getCount());
                        curr = v.substr(prev.length, v.length);
                        var checkErrors = function (error) {
                            if (error != undefined && !error.used && foundStrings['__' + error.string] == undefined && error.regexp.test(curr)) {
                                var oldlen = curr.length;
                                foundStrings['__' + error.string] = 1;
                                doReplaces.push([error.regexp, '<span class="' + error.type + '" pre="' + previous + '">$&</span>']);
                                error.used = true;
                                done = true;
                            }
                        };
                        var foundStrings = {};
                        if (current != undefined) {
                            previous = previous + ' ';
                            parent._map(current, checkErrors);
                        }
                        if (!done) {
                            previous = '';
                            parent._map(defaults, checkErrors);
                        }
                    }
                    previous = token;
                }
                if (doReplaces.length > 0) {
                    newNode = n;
                    for (var x = 0; x < doReplaces.length; x++) {
                        var regexp = doReplaces[x][0],
                            result = doReplaces[x][1];
                        var bringTheHurt = function (node) {
                            if (node.nodeType == 3) {
                                ecount++;
                                if (isIE() && node.nodeValue.length > 0 && node.nodeValue.substr(0, 1) == ' ') return parent._create('<span class="mceItemHidden">&nbsp;</span>' + node.nodeValue.substr(1, node.nodeValue.length - 1).replace(regexp, result), false);
                                else return parent._create(node.nodeValue.replace(regexp, result), false);
                            } else {
                                var contents = parent._contents(node);
                                for (var y = 0; y < contents.length; y++) {
                                    if (contents[y].nodeType == 3 && regexp.test(contents[y].nodeValue)) {
                                        var nnode;
                                        if (isIE() && contents[y].nodeValue.length > 0 && contents[y].nodeValue.substr(0, 1) == ' ') nnode = parent._create('<span class="mceItemHidden">&nbsp;</span>' + contents[y].nodeValue.substr(1, contents[y].nodeValue.length - 1).replace(regexp, result), true);
                                        else nnode = parent._create(contents[y].nodeValue.replace(regexp, result), true);
                                        parent._replaceWith(contents[y], nnode);
                                        parent.removeParent(nnode);
                                        ecount++;
                                        return node;
                                    }
                                }
                                return node;
                            }
                        };
                        newNode = bringTheHurt(newNode);
                    }
                    parent._replaceWith(n, newNode);
                }
            }
        });
        return ecount;
    },
    removeWords: function (node, w) {
        function findSpans(parent) {
            return jQuery.makeArray(parent.find('span'));
        };
        function isEmptySpan(node) {
            return (this._getAttrib(node, 'class') == "" && this._getAttrib(node, 'style') == "" && this._getAttrib(node, 'id') == "" && !this._hasClass(node, 'Apple-style-span') && this._getAttrib(node, 'mce_name') == "");
        };

        var count = 0;
        var parent = this;
        this._map(findSpans(node).reverse(), function (n) {
            if (n && (parent.isMarkedNode(n) || parent._hasClass(n, 'mceItemHidden') || parent.isEmptySpan(n))) {
                if (n.innerHTML == '&nbsp;') {
                    var nnode = document.createTextNode(' ');
                    parent._replaceWith(n, nnode);
                } else if (!w || n.innerHTML == w) {
                    parent.removeParent(n);
                    count++;
                }
            }
        });
        return count;
    },
    isMarkedNode: function (node) {
        return (this._hasClass(node, 'hiddenGrammarError') || this._hasClass(node, 'hiddenSpellError') || this._hasClass(node, 'hiddenSuggestion'));
    },
    findSuggestion: function (element) {
        var text = element.innerHTML;
        var context = (this._getAttrib(element, 'pre') + "").replace(/[\\,!\\?\\."\s]/g, '');
        if (this._getAttrib(element, 'pre') == undefined) {
            alert(element.innerHTML);
        }
        var errorDescription = undefined;
        var len = this.suggestions.length;
        for (var i = 0; i < len; i++) {
            var key = this.suggestions[i]["string"];
            if ((context == "" || context == this.suggestions[i]["context"]) && this.suggestions[i]["matcher"].test(text)) {
                errorDescription = this.suggestions[i];
                break;
            }
        }
        return errorDescription;
    },
    
    // applySuggestion: replaces a marked word with one from the suggestions list
    applySuggestion: function (element, suggestion) {
        if (suggestion == '(omit)') {
            $(element).remove();
        } else {
            var node = this._create(suggestion);
            this._replaceWith(element, node);
            this.removeParent(node);
        }
    },
    
    // removeParent: unwraps a word contained within an error span - "unmarkWord" would be a better name
    removeParent: function (node) {
        if ($(node).unwrap) return $(node).contents().unwrap();
        else return $(node).replaceWith($(node).html());
    },
    
    // setIgnoreStrings: add to the list of words the user wishes to ignore - "ignoreWord" would be a better name
    setIgnoreStrings: function (string) {
        var parent = this;
        this._map(string.split(/,\s*/g), function (string) {
            parent.ignore_strings[string] = 1;
        });
    }
};

jQuery.extend({
    AtD: {
        // atd globals
        rpc: 'CheckSpelling.proxy',
        rpc_css: 'CheckSpelling.proxy?data=',
        //rpc_css: 'http://www.polishmywriting.com/atd-jquery/server/proxycss.php?data=',
        rpc_css_lang: 'en',
        api_key: 'CAPITA-' + new Date().getTime(),
        i18n: {},
        listener: {},
        textareas: {},

        errorElement: null,
        explainURL: null,

        _callback: null,
        _counter: 0,
        _count: 0,
        _container: null,

        // global processing flags
        contentSyncInProgress: false,
        suggestShow: false,

        // core constructor
        core: AtDCore,

        // private methods wrapping AtDCore functionality
        _remove: function (container_id) {
            this._removeWords(container_id, null);
        },
        _removeWords: function (container_id, w) {
            return this.core.removeWords($('#' + container_id), w);
        },
        _processXML: function (container_id, responseXML) {
            var results = this.core.processXML(responseXML);
            if (results.count > 0) results.count = this.core.markMyWords($('#' + container_id).contents(), results.errors);
            $('#' + container_id).unbind('click', this._clickListener);
            $('#' + container_id).click(this._clickListener);
            return results.count;
        },
        _clickListener: function (event) {
            // event handler - "this" is the runtime event target, not the "this component" found elsewhere here, so use the extended jQuery.AtD reference
            if ($.AtD.core.isMarkedNode(event.target)) $.AtD.suggest(event.target);
        },

        // utils
        isOldIE: function () {
            return (navigator.appName == 'Microsoft Internet Explorer' &&
                       (
                           navigator.appVersion.match(/MSIE 8/gi) ||
                           navigator.appVersion.match(/MSIE 7/gi) ||
                           navigator.appVersion.match(/MSIE 6/gi) ||
                           navigator.appVersion.match(/MSIE 5/gi)
                       )
                   );

        },

        // pop-up menu call-ins
        suggest: function (element) {
            if ($('#suggestmenu').length == 0) {
                var suggest = $('<div id="suggestmenu"></div>');
                suggest.prependTo('body');
            } else {
                var suggest = $('#suggestmenu');
                suggest.hide();
            }
            errorDescription = this.core.findSuggestion(element);
            this.errorElement = $(element);
            suggest.empty();
            if (errorDescription == undefined) {
                suggest.append('<strong>' + this.core.getLang('menu_title_no_suggestions', 'No suggestions') + '</strong>');
            } else if (errorDescription["suggestions"].length == 0) {
                suggest.append('<strong>' + errorDescription['description'] + '</strong>');
            } else {
                suggest.append('<strong>' + errorDescription['description'] + '</strong>');
                for (var i = 0; i < errorDescription["suggestions"].length; i++) {
                    (function (sugg) {
                        suggest.append('<a href="javascript:$.AtD.useSuggestion(\'' + sugg.replace(/'/, '\\\'') + '\')">' + sugg + '</a>');
                    })(errorDescription["suggestions"][i]);
                }
            }
            //if (this._callback != undefined && this._callback.explain != undefined && errorDescription['moreinfo'] != undefined) {
            if (this._callback != undefined && this._callback.explain != undefined && errorDescription != undefined && errorDescription['moreinfo'] != undefined) { // IAT - errorDescription CAN be undefined
                suggest.append('<a href="javascript:$.AtD.explainError()" class="spell_sep_top">' + this.core.getLang('menu_option_explain', 'Explain...') + '</a>');
                this.explainURL = errorDescription['moreinfo'];
            }
            suggest.append('<a href="javascript:$.AtD.ignoreSuggestion()" class="spell_sep_top">' + this.core.getLang('menu_option_ignore_once', 'Ignore suggestion') + '</a>');
            if (this._callback != undefined && this._callback.editSelection != undefined) {
                if (this._callback != undefined && this._callback.ignore != undefined)
                    suggest.append('<a href="javascript:$.AtD.ignoreAll(\'' + this._container + '\')">' + this.core.getLang('menu_option_ignore_always', 'Ignore always') + '</a>');
                else
                    suggest.append('<a href="javascript:$.AtD.ignoreAll(\'' + this._container + '\')">' + this.core.getLang('menu_option_ignore_all', 'Ignore all') + '</a>');
                suggest.append('<a href="javascript:$.AtD.editSelection(\'' + this._container + '\')" class="spell_sep_bottom spell_sep_top">' + this.core.getLang('menu_option_edit_selection', 'Edit Selection...') + '</a>');
            } else {
                if (this._callback != undefined && this._callback.ignore != undefined)
                    suggest.append('<a href="javascript:$.AtD.ignoreAll(\'' + this._container + '\')" class="spell_sep_bottom">' + this.core.getLang('menu_option_ignore_always', 'Ignore always') + '</a>');
                else
                    suggest.append('<a href="javascript:$.AtD.ignoreAll(\'' + this._container + '\')" class="spell_sep_bottom">' + this.core.getLang('menu_option_ignore_all', 'Ignore all') + '</a>');
            }
            var pos = $(element).offset();
            var width = $(element).width();
            $(suggest).css({
                left: (pos.left + width) + 'px',
                top: pos.top + 'px'
            });

            // show the suggestions menu, then allow it to be closed
            this.suggestShow = true;
            $(suggest).fadeIn(200, function () {
                $.AtD.suggestShow = false;
            });

            // set up event to close the suggestions menu when allowed
            $("body").bind("click", function () {
                if (!$.AtD.suggestShow) {
                    $('#suggestmenu').fadeOut(200);
                }
            });
        },
        useSuggestion: function (word) {
            this.core.applySuggestion(this.errorElement, word);
            this._counter--;
            if (this._counter == 0 && this._callback != undefined && this._callback.success != undefined) {
                this._callback.success(this._count);
            }
        },
        editSelection: function () {
            var parent = this.errorElement.parent();
            var edited = false;
            if (this._callback != undefined && this._callback.editSelection != undefined) {
                edited = this._callback.editSelection(this.errorElement);
            }
            if (this.errorElement.parent() != parent) {
                if (edited) this._counter--; // only decrement the counter if the edit was successful
                if (this._counter == 0 && this._callback != undefined && this._callback.success != undefined) {
                    this._callback.success(this._count);
                }
            }
        },
        ignoreSuggestion: function () {
            this.core.removeParent(this.errorElement);
            this._counter--;
            if (this._counter == 0 && this._callback != undefined && this._callback.success != undefined) {
                this._callback.success(this._count);
            }
        },
        ignoreAll: function (container_id) {
            var target = this.errorElement.text();
            var removed = this._removeWords(container_id, target);
            this._counter -= removed;
            if (this._counter == 0 && this._callback != undefined && this._callback.success != undefined) this._callback.success(this._count);
            if (this._callback != undefined && this._callback.ignore != undefined) {
                this._callback.ignore(target);
                this.core.setIgnoreStrings(target);
            }
        },
        explainError: function () {
            if (this._callback != undefined && this._callback.explain != undefined) this._callback.explain(this.explainURL);
        },


        // *** public spellchecking API ***

        // check: calls the server with an ajax post
        check: function (container_id, callback_f) {
            if (typeof AtD_proofread_click_count != "undefined") {
                AtD_proofread_click_count++;
            }

            this._callback = callback_f;
            this._remove(container_id);

            var container = $('#' + container_id);
            var html = container.html();

            text = jQuery.trim(container.html());
            text = encodeURIComponent(text);

            var atd = this; // closure for call back
            jQuery.ajax({
                type: "POST",
                url: this.rpc + '/checkDocument',
                data: 'key=' + this.api_key + '&data=' + text,
                //data: 'data=' + text,
                format: 'raw',
                //dataType: (jQuery.browser.msie) ? "text" : "xml",
                error: function (XHR, status, error) {
                    if (atd._callback != undefined && atd._callback.error != undefined) {
                        //atd._callback.error(status + ": " + error);
                        atd._callback.error(error);
                    }
                },
                success: function (data) {
                    // load XML data
                    var xml;
                    if (typeof data == "string") {
                        //xml = new ActiveXObject("Microsoft.XMLDOM"); // IAT - should be browser capability dependent
                        if (window.DOMParser) {
                            parser = new DOMParser();
                            xml = parser.parseFromString(data, "text/xml");
                        }
                        else // Internet Explorer
                        {
                            xml = new ActiveXObject("Microsoft.XMLDOM");
                            xml.async = false;
                            xml.loadXML(data);
                        }
                    } else {
                        xml = data;
                    }

                    if (atd.core.hasErrorMessage(xml)) {
                        if (atd._callback != undefined && atd._callback.error != undefined)
                            atd._callback.error(atd.core.getErrorMessage(xml));
                        return;
                    }
                    atd._container = container_id;
                    var count = atd._processXML(container_id, xml);
                    if (atd._callback != undefined && atd._callback.ready != undefined)
                        atd._callback.ready(count);
                    if (count == 0 && atd._callback != undefined && atd._callback.success != undefined)
                        atd._callback.success(count);
                    atd._counter = count;
                    atd._count = count;
                }
            });
        },

        // checkCrossAJAX: calls the server using CSSHttpRequest - a transport mechanism limited to 2K and read-only
        checkCrossAJAX: function (container_id, callback_f) {
            if (typeof AtD_proofread_click_count != "undefined") AtD_proofread_click_count++;
            this._callback = callback_f;
            this._remove(container_id);
            var container = $('#' + container_id);
            var html = container.html();
            text = jQuery.trim(container.html());
            text = encodeURIComponent(text.replace(/\%/g, '%25'));
            if ((text.length > 2000 && navigator.appName == 'Microsoft Internet Explorer') || text.length > 7800) {
                if (callback_f != undefined && callback_f.error != undefined)
                    callback_f.error("Maximum text length for this browser exceeded");
                return;
            }

            var atd = this; // closure for call back
            CSSHttpRequest.get(
                this.rpc_css + text + "&lang=" + this.rpc_css_lang + "&nocache=" + (new Date().getTime()),
                function (response) {
                    var xml;
                    if (navigator.appName == 'Microsoft Internet Explorer') {
                        xml = new ActiveXObject("Microsoft.XMLDOM");
                        xml.async = false;
                        xml.loadXML(response);
                    } else {
                        xml = (new DOMParser()).parseFromString(response, 'text/xml');
                    }
                    if (atd.core.hasErrorMessage(xml)) {
                        if (atd._callback != undefined && atd._callback.error != undefined)
                            atd._callback.error(atd.core.getErrorMessage(xml));
                        return;
                    }
                    atd._container = container_id;
                    var count = atd._processXML(container_id, xml);
                    if (atd._callback != undefined && atd._callback.ready != undefined)
                        atd._callback.ready(count);
                    if (count == 0 && atd._callback != undefined && atd._callback.success != undefined)
                        atd._callback.success(count);
                    atd._counter = count;
                    atd._count = count;
                }
            );
        },

        // merged the old checkTextArea and _checkTextArea - a default commChannel (the check() function above) will be used if not specified
        checkTextArea: function (id, linkId, after, commChannel) {
            if (commChannel == undefined) {
                if (this.api_key == undefined || this.rpc == undefined)
                    alert("You need to set this.api_key and AtD.rpc to use AtD.checkTextArea()");
                else
                    commChannel = this.check;
            }

            var textareaNode = $('textarea#' + id);
            var opts = jQuery.extend({}, jQuery.fn.addProofreader.defaults);

            // show message to indicate the server call is in progress
            var messageNode = $('<span class="atd-button" style="display: none;"></span>');
            messageNode.attr('id', 'AtD_' + id + "_checking_message");
            messageNode.html(opts.checking_message).insertBefore(textareaNode);
            messageNode.css("position", "absolute");
            messageNode.css("top", textareaNode.position().top + (textareaNode.height() / 2 - messageNode.height() / 2) + "px");
            messageNode.css("left", textareaNode.position().left + (textareaNode.width() / 2 - messageNode.width() / 2) + "px");
            messageNode.css("z-index", "100").fadeIn();

            // call the server
            if (commChannel != undefined) {
                id = id.replace('_AtD_div', '', 'gi');
                var container = textareaNode;
                if (this.textareas[id] == undefined) {
                    var properties = {};
                    var saveProperty = function (key, node) {
                        if (node.css(key) != "") properties[key] = node.css(key);
                    }
                    //var saveme = ['background-color', 'color', 'font-size', 'font-family', 'border-top-width', 'border-bottom-width', 'border-left-width', 'border-right-width', 'border-top-style', 'border-bottom-style', 'border-left-style', 'border-right-style', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color', 'text-align', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right', 'width', 'line-height', 'letter-spacing', 'left', 'right', 'top', 'bottom', 'position', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom'];
                    var saveme = ['background-color', 'color', 'font-size', 'font-family', 'border-top-width', 'border-bottom-width', 'border-left-width', 'border-right-width', 'border-top-style', 'border-bottom-style', 'border-left-style', 'border-right-style', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color', 'text-align', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right', 'line-height', 'letter-spacing', 'left', 'right', 'top', 'bottom', 'position', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom']; // IAT removed width - causes a problem in IE8
                    for (var x = 0, node = container; x < saveme.length; x++) {
                        saveProperty(saveme[x], node);
                    }
                    this.textareas[id] = {
                        'node': container,
                        'height': container.height(),
                        'width': container.width(),
                        'link': $('#' + linkId),
                        'before': $('#' + linkId).html(),
                        'after': after,
                        'style': properties
                    };
                }
                var options = this.textareas[id];
                if ($(options["link"].selector).html() != options['before']) {
                    this.restoreTextArea(id + '_AtD_div');
                } else {
                    //options['link'].html(options['after']); // IAT - SOMETIMES options['link'] appears to be a COPY, so the button text doesn't change (Chrome)
                    $(options["link"].selector).html(options['after']);
                    var disableClick = function () {
                        return false;
                    };
                    options['link'].click(disableClick);
                    var div;
                    if (this.isOldIE()) {
                        container.after('<div id="' + id + '_AtD_div">' + container.val().replace(/\&/g, '&amp;').replace(/[\n\r\f]/gm, '<BR class="atd_remove_me">') + '</div>');
                        div = $('#' + id + '_AtD_div');
                        div.attr('style', options['node'].attr('style'));
                        div.attr('class', options['node'].attr('class'));
                        div.css({
                            'display': 'none', // IAT added - hidden until the last moment
                            'overflow': 'auto'
                        });
                        options['style']['font-size'] = undefined;
                        options['style']['font-family'] = undefined;
                    } else {
                        container.after('<div id="' + id + '_AtD_div">' + container.val().replace(/\&/g, '&amp;') + '</div>');
                        div = $('#' + id + '_AtD_div');
                        div.attr('style', options['node'].attr('style'));
                        div.attr('class', options['node'].attr('class'));
                        div.css({
                            'display': 'none', // IAT added - hidden until the last moment
                            'overflow': 'auto',
                            'white-space': 'pre-wrap'
                        });
                        div.attr('contenteditable', 'false'); // IAT - was true, but allows a bug (?) when all spelling suggestions are replaced with new mis-spelled text, ending in HTML tags being present in the original textarea
                        div.attr('spellcheck', false);
                        div.css({
                            'outline': 'none'
                        });
                    }

                    // ignore enter key
                    div.keypress(function (event) {
                        return event.keyCode != 13;
                    });

                    // IAT new event replacing the previous mish-mash - required in case user hits "submit" before "spelling done"
                    div.blur(function () { $.AtD.syncTextAreaContents(container, div) });

                    // swap the textarea for the spell checking div
                    container.hide();

                    div.css(options['style']);
                    div.css({ // IAT - temp, to make the div appear as the textarea did when hovered
                        'background-color': '#FFFFDD',
                        'border-color': '#31A6CE'
                    });
                    div.height(options['height']);
                    div.width(options['width']);
                    div.show();

                    commChannel(id + '_AtD_div', {
                        ready: function (errorCount) {
                            options['link'].unbind('click', disableClick);

                            // hide the "checking" message
                            messageNode.fadeOut('slow', function () { messageNode.remove(); });
                        },
                        explain: function (url) {
                            var left = (screen.width / 2) - (480 / 2);
                            var top = (screen.height / 2) - (380 / 2);
                            window.open(url, '', 'width=480,height=380,toolbar=0,status=0,resizable=0,location=0,menuBar=0,left=' + left + ',top=' + top).focus();
                        },
                        success: function (errorCount) {
                            if (errorCount == 0) alert($.AtD.core.getLang('message_no_errors_found', "No writing errors were found"));

                            $.AtD.restoreTextArea(id + '_AtD_div');
                        },
                        error: function (reason) {
                            options['link'].unbind('click', disableClick);
                            if (reason == undefined)
                                alert($.AtD.core.getLang('message_server_error_short', "There was an error communicating with the spell checking service."));
                            else
                                alert($.AtD.core.getLang('message_server_error_short', "There was an error communicating with the spell checking service.") + "\n\n" + reason);

                            $.AtD.restoreTextArea(id + '_AtD_div');
                            messageNode.remove();
                        },
                        editSelection: function (element) {
                            var text = "";
                            while (text == "") {
                                text = prompt($.AtD.core.getLang('dialog_replace_selection', "Replace selection with:"), element.text());
                            }
                            if (text != null && text != "") {
                                $(element).html(text);
                                $.AtD.core.removeParent(element);
                                return true;
                            }

                            return false; // no change made - don't decrement counter!
                        }
                    });
                }
            }
        },
        checkTextAreaCrossAJAX: function (id, linkId, after) {
            this.checkTextArea(id, linkId, after, this.checkCrossAJAX);
        },

        restoreId: function (id) {
            return id.replace('_AtD_div', '', 'gi');
        },

        restoreTextArea: function (id) {
            if (!id.match(/^.*_AtD_div$/gi)) {
                id += '_AtD_div';
            }
            var spellingDiv = $("#" + id); // get the spell checker div before it is disposed

            id = id.replace('_AtD_div', '', 'gi');
            var options = this.textareas[id];
            if (options == undefined || options['before'] == $(options["link"].selector).html()) return;

            // one last sync, otherwise the last spelling error corrected may not be synced in time before the spelling div is removed
            var textArea = $("#" + id); // get the original textarea
            this.syncTextAreaContents(textArea, spellingDiv);

            this._remove(id + '_AtD_div');
            $('#' + id + '_AtD_div').remove();
            var container = $('textarea[id=' + id + ']');
            container.show();

            $(options["link"].selector).html(options['before']);
        },

        syncTextAreaContents: function (textArea, spellingDiv, delayms) {
            function _doSync(_atd, textArea, spellingDiv) {
                // IAT - remove markup, regardless of browser (otherwise IE9 submits with potentially dangerous request, causing MVC validation exception)
                var content = spellingDiv.html().replace(/<BR.*?class.*?atd_remove_me.*?>/gi, "\n");
                var temp = $('<div></div>');
                temp.html(content);

                _atd.core.removeWords(temp);
                textArea.val(temp.html().replace(/\&lt\;/g, '<').replace(/\&gt\;/, '>').replace(/\&amp;/g, '&'));

                _atd.contentSyncInProgress = false;
            }

            if (this.contentSyncInProgress) return;
            this.contentSyncInProgress = true;

            if (delayms != undefined && delayms > 0) {
                setTimeout(function () {
                    _doSync(this, textArea, spellingDiv); // delayed, on a separate thread, hence no wait in the calling code
                }, delayms);
            }
            else {
                _doSync(this, textArea, spellingDiv); // immediate, with wait
            }
        }
    }
});

jQuery.fn.extend({
    addProofreader: function (options) {
        this.id = 0;
        var parent = this;
        var opts = jQuery.extend({}, jQuery.fn.addProofreader.defaults);
        return this.each(function () {
            $this = jQuery(this);
            if ($this.css('display') == 'none') return;
            if ($this.attr('id').length == 0) {
                $this.attr('id', 'AtD_' + parent.id++);
            }
            var id = $this.attr('id');
            var node = jQuery('<span></span>');
            node.attr('id', 'AtD_' + parent.id++);
            node.html(opts.proofread_content);
            node.click(function (event) {
                if (AtD.current_id != undefined && AtD.current_id != id) {
                    AtD.restoreTextArea(AtD.current_id);
                }
                if (AtD.api_key != "" && AtD.rpc != "") {
                    AtD.checkTextArea(id, node.attr('id'), opts.edit_text_content);
                } else {
                    AtD.checkTextAreaCrossAJAX(id, node.attr('id'), opts.edit_text_content);
                }
                AtD.current_id = id;
            });
            $this.wrap('<div></div>');
            $this.parents('form').submit(function (event) {
                AtD.restoreTextArea(id);
            });
            $this.before(node);
        });
    },
    spellcheck: function (linkId, after, commChannel) {
        return this.each(function () {
            var id = $(this).attr('id');
            $.AtD.checkTextArea(id, linkId, after, commChannel);
        });
    },
    unspellcheck: function () {
        return this.each(function () {
            $.AtD.restoreTextArea($(this).attr('id'));
        });
    },
    spellcheckasyoutype: function (commChannel) {
        // **** future implementation idea ****
        return this.each(function () {
            atdDiv = $(this).replaceWithAtDDiv($(this).id)
            $(atdDiv).bind("keyup", function (evt) {
                if (evt.which == 32) // check the last word after <space> entered
                {
                    // get caret position
                    // get the word(s) at/before the caret
                    // check just the word plus its predecessor, for context
                    $.AtD.checkWord($(this).id, word, commChannel); // as yet undefined, but has to ultimately call the server's /checkDocument anyway
                }
            });
        });
    }
});
jQuery.fn.addProofreader.defaults = {
    edit_text_content: '<span class="AtD_edit_button"></span>',
    proofread_content: '<span class="AtD_proofread_button"></span>',
    checking_message: '<span class="atd-button-inner AtD_checking_message"><span class="atd-spelling-icon" />Checking...</span>'
};

// *********************************************

var EXPORTED_SYMBOLS = ['AtDCore']; // don't know what this was for
