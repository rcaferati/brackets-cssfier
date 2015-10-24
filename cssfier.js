define(function (require, exports, module) {
	var order = 0;

	function getSelectors(el) {
		if (!el) return;
		var selector = [];
		if (el.className && el.className.split) {
			var classes = el.className.split(" ");
			for (var i in classes) {
				selector.push("." + classes[classes.length - 1 - i]);
			}
		}
		if (el.id) {
			selector.push("#" + el.id);
		}
		if (selector.length === 0) {
			selector.push(el.tagName.toLowerCase());
		}
		return selector;
	}

	function recursive(array, params) {
		params = params || {};
		var can_go = 1;

		function recursive(array, parent, depth, back) {
			if (!can_go) return;
			if (array.length > 0) {
				for (var i = 0; i < array.length; i++) {
					if (!can_go) return;
					if (params.callback) {
						can_go = params.callback(array[i], array, parent, depth, i, back);
					}
					if (!can_go) return;
					if (array && array[i] && array[i].children.length > 0) {
						recursive(array[i].children, array, depth + 1, i);
					}
				}
			}
		}
		recursive(array, null, 0, 0);
	}

	function printAdd(what, printed) {
		printed.text = printed.text + what;
	}

	function printIndentedChildren(array, printed, params) {
		var _array,
			selectors = [],
			params = params || {
				open: "{",
				close: "}"
			};
		if (array.length > 0) {
			for (var i = 0; i < array.length; i++) {
				_array = array[i];
				printAdd(
					_array.selector + " " + params.open + "\n",
					printed
				);
				if (_array.tag == "a") {
					printAdd(
						"&:hover" + params.open + "\n" +
						params.close + "\n",
						printed
					);
				}
				if (_array.all.length) {
					for (var n in _array.all) {
						printAdd(
							"&" + _array.all[n] + params.open + "\n" +
							params.close + "\n",
							printed
						);
					}
				}
				if (_array.children.length > 0) {
					printIndentedChildren(_array.children, printed, params);
				}
				printAdd(
					params.close + "\n",
					printed
				);
				selectors.push(printed.text);
			}
		}
	}

	function printIndented(array) {
		var printed = {
			text: ""
		};
		printIndentedChildren(array, printed);
		return printed.text.trim().replace(/\n$/, "");
	}

	function printCSSChildren(array, parents, printed) {
		var send = [],
			_array,
			n;
		if (array.length > 0) {
			for (var i = 0; i < array.length; i++) {
				_array = array[i];
				printAdd(
					(parents.length ? parents.join(" ") + " " + _array.selector : _array.selector) +
					" {\n}\n",
					printed
				);
				if (_array.all.length) {
					for (n in _array.all) {
						printAdd(
							parents.length ?
							parents.join(" ") + " " + _array.selector :
							_array.selector + _array.all[n] + "{\n}\n",
							printed
						);
					}
				}

				if (array[i].children && array[i].children.length) {
					send = parents.slice(0);
					send.push(array[i].selector);
					printCSSChildren(array[i].children, send, printed);
				}
			}
		}
	}

	function printCSS(array) {
		var printed = {
			text: ""
		};
		printCSSChildren(array, [], printed);
		return printed.text.trim().replace(/\n$/, "");
	}

	function printClean(array) {
		var printed = {
			text: ""
		};
		printIndentedChildren(array, printed, {
			open: "",
			close: ""
		});
		return printed.text.trim().replace(/\n$/, "") + "\n";
	}

	function hasChild(element, compare) {
		var has = false;
		if (element.children && !element.children.length) {
			return has;
		}
		recursive(element.children, {
			callback: function (el, array, parent, depth) {
				if (el !== compare.element) {
					if (el.selector == compare.selector) {
						if (el.tag == compare.tag) {
							has = true;
							return false;
						}
					}
				}
				return true;
			}
		});
		return has;
	}

	function getLastDepth(array) {
		var d = 0;
		recursive(array, {
			callback: function (el, array, parent, depth) {
				if (depth > d) {
					d = depth;
				}
				return true;
			}
		});
		return d;
	}

	function getSelectorsFromDepth(array, n) {
		var result = [],
			root;
		recursive(array, {
			callback: function (el, array, parent, depth, i, back) {
				if (depth === 0) {
					root = el;
				}
				if (depth == n) {
					result.push({
						parent: parent,
						element: el,
						selector: el.selector,
						root: root,
						tag: el.tag,
						back: back
					});
				}
				return true;
			}
		});
		return result;
	}

	function toParent(array, parent, element, pos) {
		var result = [];
		recursive(array, {
			callback: function (el, arr, parent, depth, i) {
				var can_go = 1;
				if (el === element) {
					can_go = false;
					var n = $.extend(true, {}, el);
					n.depth = n.depth - 1;
					parent.splice(pos + 1, 0, n);
					arr.splice(i, 1);
				}
				return can_go;
			}
		});
		return array;
	}

	function emptyCheck(array) {
		var result = [];
		recursive(array, {
			callback: function (el, arr, parent, depth) {
				if (parent) {
					var dif = el.depth - parent[0].depth;
					if (dif > 1) {
						el.depth = el.depth - dif + 1;
					}
				}
				return true;
			}
		});
	}

	function refactor(cssi, css) {
		var max = getLastDepth(cssi),
			selectors,
			current,
			parent,
			has, i, j, n;
		//for (i = max; i > 1; i--) {
		for (i = 2; i <= max; i++) {
			selectors = getSelectorsFromDepth(cssi, i);
			for (j in selectors) {
				current = selectors[j];
				parent = selectors[j].parent;
				has = false;
				for (n in parent) {
					if (hasChild(parent[n], current)) {
						has = true;
						break;
					}
					if (current.selector === parent[n].selector || current.tag === parent[n].tag) {
						if (current.tag != parent[n].tag && current.element.selector.match(/^(\.|\#)/)) {
							current.element.selector = current.tag + current.selector;
							if (parent[n].selector && parent[n].selector.match(/^(\.|\#)/)) {
								parent[n].selector = parent[n].tag + parent[n].selector;
							}
						} else {
							if (current.selector === parent[n].selector || current.tag === current.selector) {
								has = true;
								break;
							}
						}
					}
				}
				if (!has) {
					toParent(css, parent, current.element, current.back);
					return false;
				}
			}
		}
		return true;
	}

	function refactorAll(array) {
		var result = [],
			ref;
		recursive(array, {
			callback: function (el, arr, parent, depth) {
				ref = refactor([el], array);
				if (ref == 9) {
					return false;
				}
				if (!ref) {
					refactorAll(array);
					return false;
				}
				return true;
			}
		});
	}

	function swap(array, i, j) {
		var temp = array[j];
		array[j] = array[i];
		array[i] = temp;
	}

	function reorder(array) {
		var result = [],
			ref,
			index,
			prev;
		recursive(array, {
			callback: function (el, arr, parent, depth) {
				index = arr.indexOf(el);
				if (index > 0) {
					prev = index - 1;
					if (arr[prev].order > el.order) {
						swap(arr, index, prev);
						reorder(array);
						return false;
					}
				}
				return true;
			}
		});
	}

	function addDepth(index, css, selector, tag, depth) {
		if (css[index]) {
			while (css[index]) {
				index++;
			}
		}
		css[index] = {};
		css[index].selector = selector[selector.length - 1];
		selector.splice(selector.length - 1, 1);
		css[index].all = selector;
		css[index].depth = depth;
		css[index].tag = tag;
		css[index].order = order++;
		css[index].children = [];
		return index;
	}

	function populate(all, css, depth) {
		all = $(all).children();
		var i = 0,
			selectors = [],
			selector,
			index,
			ready,
			to_add;

		all.each(function () {
			var z, x;
			selector = getSelectors(this);
			index = [];
			for (z in css) {
				for (x in selector) {
					if (css[z].selector == selector[x]) {
						index.push(x);
					}
				}
			}
			to_add = [];
			for (x in selector) {
				if (
					index.indexOf(x) == -1 &&
					to_add.indexOf(selector[x]) == -1) {
					to_add.push(selector[x]);
				}
			}
			if (to_add.length > 0) {
				index = addDepth(i, css, selector, this.tagName.toLowerCase(), depth);
			}
			if (this.children && this.children.length > 0 && index >= 0) {
				populate(this, css[index].children, depth + 1);
			}
		});
	}

	function run(text, type) {

		if(typeof text !== "string" || text.length == 0){
			return "";
		}

		var object = document.createElement("div"),
			css = [],
			printed;

		text = text.replace(/[\t]+/mig, " ")
			.replace(/[\s]+/mig, " ")
			.replace(/^[\s]+/mig, "")
			.replace(/[\s]+$/mig, "")
			.replace(/(\>)([\s]+)(\<)/mig, "$1$3");

		if (!text.match(/^(\<)(.*)(\>)$/)) {
			return;
		}

		order = 0;
		object.innerHTML = text;
		populate(object, css, 0);
		refactorAll(css);
		emptyCheck(css);
		reorder(css);

		switch (type) {
			case "css":
				printed = printCSS(css);
				break;
			default:
				printed = printIndented(css);
		}

		return printed;
	}

	return {
		run: run
	};
});
