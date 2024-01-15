export class ControlUtils {

    static create(parent: HTMLElement, name: string, classid?: string, txt?: string): HTMLElement {
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

    static createDiv(parent: HTMLElement, classname?: string) {
        return ControlUtils.create(parent, "div", classname) as HTMLDivElement;
    }

    static createButton(parent: HTMLElement, txt: string, action?: (b: HTMLButtonElement) => void, value?: string, classname?: string): HTMLButtonElement {
        if (!classname) {
            classname = "button";
        }
        const b = ControlUtils.create(parent, "button", classname) as HTMLButtonElement;
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

    static removeAllChildren(parent: HTMLElement): void {
        let node = parent;
        while (node.lastChild) {
            node.removeChild(node.lastChild);
        }
    }

    static isMobile = (): boolean => window.matchMedia('(max-width: 480px)').matches;

}
