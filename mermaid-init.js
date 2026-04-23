// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

(() => {
    const darkThemes = ['ayu', 'navy', 'coal'];
    const lightThemes = ['light', 'rust'];

    const classList = document.getElementsByTagName('html')[0].classList;

    let lastThemeWasLight = true;
    for (const cssClass of classList) {
        if (darkThemes.includes(cssClass)) {
            lastThemeWasLight = false;
            break;
        }
    }

    const theme = lastThemeWasLight ? 'default' : 'dark';
    mermaid.initialize({
        startOnLoad: false,
        theme: theme,
        fontSize: 30,
        fontFamily: "Verdana, Arial, Trebuchet MS, Courier New, sans-serif",
        sequence: {
            diagramMarginX: 10,
            diagramMarginY: 10,
            messageMargin: 10,
            boxMargin: 10,
            boxTextMargin: 10,
            actorMargin: 15,
            noteMargin: 10,
            width: 150,
            height: 40
        }
    });

    mermaid.run({
        querySelector: '.mermaid',
        postRenderCallback: (id) => {
            var svgElements = document.getElementById(id);
            var contentDiv = document.getElementById("mdbook-content");
            var contentWidth = contentDiv ? contentDiv.offsetWidth * 0.85 : 1300;

            var panZoomTiger = svgPanZoom(svgElements, {
                controlIconsEnabled: true
            });
            svgElements.style.width = contentWidth + "px";
            svgElements.style.height = "750px";

            var preElems = document.getElementsByClassName("mermaid");
            for (elem of preElems) {
                elem.style.width = contentWidth + "px";
                elem.style.transform = "translateX(-35%)";
                elem.style.left = "15%";
                elem.style.border = "3px dotted #e0e0e0";
                elem.style.borderRadius = "8px";
            }

            // Add resize observer to dynamically update width
            if (contentDiv) {
                var resizeObserver = new ResizeObserver(function(entries) {
                    var newWidth = entries[0].contentRect.width * 0.85;
                    svgElements.style.width = newWidth + "px";
                    for (elem of preElems) {
                        elem.style.width = newWidth + "px";
                    }
                    panZoomTiger.resize();
                    panZoomTiger.fit();
                    panZoomTiger.center();
                });
                resizeObserver.observe(contentDiv);
            }

            panZoomTiger.resize(); // update SVG cached size and controls positions
            panZoomTiger.fit();
            panZoomTiger.center();

            console.log(id);
        }
    });

})();
