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
import { useApp } from '@backstage/core-plugin-api';
import MuiIcon from '@mui/material/Icon';
import Box from '@mui/material/Box';

interface HeaderIconProps {
  icon: string;
  styles?: React.CSSProperties;
}

export const HeaderIcon = ({ icon, styles }: HeaderIconProps) => {
  const app = useApp();
  if (!icon) {
    return null;
  }

  const SystemIcon = app.getSystemIcon(icon);

  if (SystemIcon) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', ...styles }}>
        <SystemIcon fontSize="small" />
      </Box>
    );
  }

  if (icon.startsWith('<svg')) {
    const svgDataUri = `data:image/svg+xml;base64,${btoa(icon)}`;
    return (
      <MuiIcon style={{ fontSize: 20, ...styles }}>
        <img src={svgDataUri} alt="" />
      </MuiIcon>
    );
  }

  if (
    icon.startsWith('https://') ||
    icon.startsWith('http://') ||
    icon.startsWith('/')
  ) {
    return (
      <MuiIcon
        style={{ fontSize: 20, ...styles }}
        baseClassName="material-icons-outlined"
      >
        <img src={icon} alt="" />
      </MuiIcon>
    );
  }

  return (
    <MuiIcon style={{ fontSize: 20 }} baseClassName="material-icons-outlined">
      {icon}
    </MuiIcon>
  );
};
