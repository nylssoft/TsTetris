export default class Controls {
    static create(parent, name, classid, txt) {
        const e = document.createElement(name);
        if (classid) {
            e.setAttribute("class", classid);
        }
        parent.appendChild(e);
        if (txt) {
            e.textContent = txt;
        }
        return e;
    }
    ;
    static createDiv(parent, classname) {
        return Controls.create(parent, "div", classname);
    }
    ;
    static createButton(parent, txt, action, value, classname) {
        if (!classname) {
            classname = "button";
        }
        const b = Controls.create(parent, "button", classname);
        b.title = txt;
        b.textContent = txt;
        if (action) {
            b.addEventListener("click", e => action(b));
        }
        if (value) {
            b.value = value;
        }
        return b;
    }
    ;
    static removeAllChildren(parent) {
        let node = parent;
        while (node.lastChild) {
            node.removeChild(node.lastChild);
        }
    }
    ;
}
//# sourceMappingURL=controls.js.map