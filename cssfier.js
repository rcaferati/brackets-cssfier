define(function (/* require, exports, module */) {
	var order = 0;
	var bemParentClassName = false;

	function getSelectors(el) {//クラス名を逆順に配列に格納して末尾にidを入れた配列を返す関数。無ければタグ名。
		if (!el) return;
		var selector = [];//セレクターを格納する配列。
		if (el.className && el.className.split) {//要素のクラス名があれば。
			var classes = el.className.split(" ");//クラス名をスペースで分割して配列に。
			for (var i = classes.length - 1; i >= 0; i--) {//クラス名配列を逆順にしてselector配列に格納。
				selector.push("." + classes[i]);
			}
		}
		if (el.id) {//IDがあれば。
			selector.push("#" + el.id);//selector配列にの末尾に追加。
		}
		if (selector.length === 0) {
			selector.push(el.tagName.toLowerCase());//idやクラス名が無ければタグ名をselector配列に入れる。
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
		//arrayにはrunのcss配列が入ってる。各要素の情報オブジェクト達。
		var _array,
			selectors = [],
			params = params || {
				open: "{",
				close: "}"
			};

		//console.log(array);

		if (array.length > 0) {
			for (var i = 0; i < array.length; i++) {
				_array = array[i];
				
				if(bemParentClassName && _array.depth > 0){//2階層目以降のみ
					_array.selector = _array.selector.replace(bemParentClassName, "&__");
				}

				if (_array.selector.slice(0, 1) === "." && _array.depth === 0) {//メインセレクタがクラスだったら&&1階層目のみ
					bemParentClassName = _array.selector + "__";
				}

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
					for (var n = 0; n < _array.all.length; n++) {
						if(bemParentClassName){
							_array.all[n] = _array.all[n].replace(bemParentClassName, "&__");
							_array.all[n] = _array.all[n].replace(_array.selector, "");
						}
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
				//bemParentClassName = false;
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
					for (n = 0; n < _array.all.length; n++) {
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
			for (j = 0; j < selectors.length; j++) {
				current = selectors[j];
				parent = selectors[j].parent;
				has = false;
				for (n = 0; n < parent.length; n++) {
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

	function addDepth(index, css, selector, tag, depth) {//indexはi。css,selectorは配列。tagはタグ名。depthには最初0が入ってる。
		if (css[index]) {//css配列は最初、空っぽ。
			while (css[index]) {//css配列のindex番目がある限り、indexをインクリメント。
				index++;//結局、配列が3まであるならindexは4になる。lengthで良いのでは。
			}
		}
		css[index] = {};//css配列の末尾にオブジェクトを追加。pushで良いのでは。
		css[index].selector = selector[selector.length - 1];
		//css配列のindex番目のselectorプロパティに、セレクタ配列の末尾のセレクタを入れる。idがあればid。無ければ最後のクラス名。メインのセレクタを入れてるっぽい。
		selector.splice(selector.length - 1, 1);//セレクタ配列の末尾のセレクタを削除。
		css[index].all = selector;//残りのセレクタをallプロパティに格納。
		css[index].depth = depth;//depthは最初0。
		css[index].tag = tag;//タグ名。
		css[index].order = order++;//順番を入れていると推測。
		css[index].children = [];//childrenプロパティに空配列を入れる。
		return index; //iを返す。
	}

	function populate(all, css, depth) {//runから最初に実行される関数。allにはhtml文をラップしたdiv。cssには空の配列。depthには最初0が入ってる（初期）。
		//2回目はallには子が入ってくる。depthは1（階層っぽい）。
		//css配列には、各要素の情報がどんどん入れられてくみたい。
		all = $(all).children();//html文をjQueryにぶち込んでObject化。
		var i = 0,
			selectors = [],
			selector,//クラス名が逆順に加工されている。末尾にID。無ければタグ名。
			index,
			ready,
			to_add;//配列。

		all.each(function () {//子要素というか、0階層目の要素全部に実行。
			var z, x;
			selector = getSelectors(this);//クラス名を逆順に配列に格納して末尾にidを入れた配列を返す関数。無ければタグ名。
		
			index = [];//indexには最初、空配列を入れる。でも後でただの数値に入れ替える。
			//css配列のメンバ達のメインセレクタ達の番号をindex配列に格納するみたい。
			for (z = 0; z < css.length; z++) {//css配列分、回す。最初はcss配列は空なので何もしない。
				for (x = 0; x < selector.length; x++) {//さらにその中でこの要素のセレクタ配列分、回す。
					if (css[z].selector == selector[x]) {//css配列のz番目のメインセレクタと同じだったら
						index.push(x); //index配列にx（数字）をpushする。
					}
				}
			}
			to_add = [];
			for (x = 0; x < selector.length; x++) {//セレクタ配列を回す。
				if (//もしindex配列にもto_addにもx（そのセレクタ）が無ければ
					index.indexOf(x) == -1 &&
					to_add.indexOf(selector[x]) == -1) {
					to_add.push(selector[x]);//to_add配列の末尾に追加。
				}
			}
			if (to_add.length > 0) {//to_add配列に何か入ってたら
				//index配列にaddDepthの返り値（ただの数値）を格納。
				index = addDepth(i, css, selector, this.tagName.toLowerCase(), depth);
			}
			if (this.children && this.children.length > 0 && index >= 0) {//孫がいて、indexが0以上なら
				populate(this, css[index].children, depth + 1);//深さを1上げて、孫たちにも実行。
			}
		});
	}

	function run(text, type) {
	
		if(typeof text !== "string" || text.length == 0){
			return "";
		}

		var object = document.createElement("div"),
			css = [],//cssには各要素の情報オブジェクトがどんどん詰められてくみたい。何階層目かを表すdepthプロパティもあるよ。
			printed;

		text = text.replace(/[\t]+/mig, " ")
			.replace(/[\s]+/mig, " ")
			.replace(/^[\s]+/mig, "")
			.replace(/[\s]+$/mig, "")
			.replace(/(>)([\s]+)(<)/mig, "$1$3");

		if (!text.match(/^(<)(.*)(\>)$/)) {
			return "";
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
