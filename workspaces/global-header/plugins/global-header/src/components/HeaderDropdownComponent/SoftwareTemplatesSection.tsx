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

import React from 'react';

import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import MenuSection, { MenuItemConfig } from './MenuSection';

/**
 * Software Templates Section properties
 *
 * @public
 */
export type SoftwareTemplatesSectionProps = {
  items: MenuItemConfig[];
  handleClose: () => void;
  hideDivider?: boolean;
};

export const SoftwareTemplatesSection = ({
  items,
  handleClose,
  hideDivider,
}: SoftwareTemplatesSectionProps) => {
  if (items.length === 0) {
    return (
      <>
        <Typography
          variant="body2"
          sx={{ mx: 2, my: 1, color: 'text.disabled' }}
        >
          No templates available
        </Typography>
        {!hideDivider && <Divider sx={{ my: 0.5 }} />}
      </>
    );
  }
  return (
    <MenuSection
      hideDivider={hideDivider}
      sectionLabel="Use a template"
      optionalLink="/create"
      optionalLinkLabel="All templates"
      items={items}
      handleClose={handleClose}
    />
  );
};
