/*
 * Copyright 2026 The Islet Project Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

document.addEventListener('DOMContentLoaded', function () {
    const images = document.querySelectorAll('.content main img[title="large-view"]');

    images.forEach(img => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', function () {
            if (img.classList.contains('fullscreen-img')) {
                img.classList.remove('fullscreen-img');
                img.style.cursor = 'zoom-in';
            } else {
                img.classList.add('fullscreen-img');
                img.style.cursor = 'zoom-out';
            }
        });
    });
});

