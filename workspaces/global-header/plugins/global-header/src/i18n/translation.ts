/*
 * Copyright Red Hat, Inc.
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
 */
import { createTranslationRef } from '@backstage/core-plugin-api/alpha';

// this can be imported from a i18n resource package later
const zh = {
  'searchBar.noResultsFound': '没有结果',
  'searchBar.errorFetchingResults': '获取结果时出错',
};

const jp = {
  'searchBar.noResultsFound': '結果が見つかりません',
  'searchBar.errorFetchingResults': '結果の取得中にエラーが発生しました',
};

const sp = {
  'searchBar.noResultsFound': 'No se encontraron resultados',
  'searchBar.errorFetchingResults': 'Error al obtener resultados',
};

/** @alpha */
export const globalHeaderTranslationRef = createTranslationRef({
  id: 'global-header',
  translations: {
    zh: () => Promise.resolve({ default: zh }),
    jp: () => Promise.resolve({ default: jp }),
    sp: () => Promise.resolve({ default: sp }),
  },
  messages: {
    searchBar: {
      noResultsFound: 'No results found',
      errorFetchingResults: 'Error fetching results',
    },
  },
});
