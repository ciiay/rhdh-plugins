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

import { useEffect, useMemo, useState } from 'react';

import { makeStyles } from '@material-ui/core';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Button, Modal, Switch, Title, Tooltip } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  KeyIcon,
  LockIcon,
  OffIcon,
  SortAmountDownIcon,
  SortAmountUpIcon,
  TimesIcon,
} from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

type ServerStatus = 'tokenRequired' | 'disabled' | 'ok' | 'failed' | 'unknown';

type McpServer = {
  id: string;
  name: string;
  enabled: boolean;
  status: ServerStatus;
  detail: string;
  hasSavedToken?: boolean;
  errorMessage?: string;
};

type McpServersSettingsProps = {
  onClose: () => void;
  backgroundColor?: string;
};

type TokenValidationState = 'idle' | 'validating' | 'success' | 'error';

const SAVED_TOKEN_MASK = '********************';

const useStyles = makeStyles(theme => ({
  root: {
    padding: 0,
    height: '100%',
    width: '100%',
    overflow: 'auto',
    backgroundColor: theme.palette.action.disabled,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(2),
    marginLeft: theme.spacing(3),
    marginRight: theme.spacing(2),
  },
  selectedCount: {
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
    fontSize: '0.75rem',
  },
  title: {
    fontSize: '1.125rem',
  },
  closeButton: {
    marginTop: -theme.spacing(1),
    marginRight: -theme.spacing(1),
    color: theme.palette.text.secondary,
  },
  nameHeaderButton: {
    paddingLeft: 0,
    paddingTop: 0,
    paddingBottom: 0,
    marginLeft: '-0.85rem',
    fontWeight: 600,
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
    minHeight: 'auto',
    color: theme.palette.text.primary,
    textDecoration: 'none !important',
    display: 'inline-flex',
    alignItems: 'center',
  },
  nameHeaderText: {
    paddingLeft: '7px',
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
    fontWeight: 600,
  },
  nameCell: {
    paddingLeft: '8px !important',
  },
  statusHeader: {
    paddingLeft: '0 !important',
  },
  statusColumnCell: {
    paddingLeft: '0 !important',
  },
  rowName: {
    fontSize: '1rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  nameValue: {
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  statusCell: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    whiteSpace: 'nowrap',
  },
  statusValue: {
    fontSize: '0.875rem',
  },
  statusOk: {
    color: '#147878',
  },
  statusToken: {
    color: '#147878',
  },
  statusWarn: {
    color: '#B1380B',
  },
  statusDisabled: {
    color: theme.palette.text.secondary,
  },
  actionButton: {
    color: theme.palette.text.secondary,
  },
  modalDescription: {
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  modalContent: {
    position: 'relative',
    padding: theme.spacing(3, 0, 3, 3),
    marginRight: theme.spacing(3),
  },
  modalCustomCloseButton: {
    position: 'absolute',
    top: theme.spacing(2),
    right: theme.spacing(-0.5),
    color: '#1F1F1F',
  },
  modalHeading: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.75),
    marginBottom: theme.spacing(1),
    fontSize: '1.25rem',
    lineHeight: 1.4,
    fontWeight: 500,
    '& .v5-MuiTypography-root': {
      fontSize: '1.25rem',
      lineHeight: 1.4,
      fontWeight: 500,
    },
  },
  tokenRow: {
    position: 'relative',
  },
  tokenClearButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1,
    color: theme.palette.text.secondary,
  },
  tokenHelper: {
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
    marginTop: theme.spacing(0.5),
  },
  tokenInput: {
    marginTop: '1rem !important',
    '& .MuiOutlinedInput-root': {
      height: '3.5rem',
    },
    '& .MuiOutlinedInput-input': {
      padding: '0 0.875rem',
    },
    '& .MuiInputLabel-root': {
      fontSize: '0.875rem',
    },
  },
  tokenInputSuccess: {
    '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
      borderColor: '#3E8635',
      borderWidth: 1,
    },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#3E8635',
    },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#3E8635',
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: '#3E8635',
    },
  },
  tokenInputError: {
    '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
      borderColor: '#C9190B',
      borderWidth: 1,
    },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#C9190B',
    },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#C9190B',
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: '#C9190B',
    },
  },
  modalActions: {
    marginTop: theme.spacing(3),
    display: 'flex',
    gap: theme.spacing(1),
  },
  modalActionButton: {
    fontSize: '1rem',
  },
  modalCancelButton: {
    fontSize: '1rem',
  },
  forgetTokenButton: {
    fontSize: '1rem',
    border: '1px solid #B1380B',
    borderRadius: '1.25rem',
    padding: '0.375rem 1rem',
    color: '#B1380B',
    backgroundColor: 'transparent',
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    boxShadow: 'none',
    '&:hover': {
      backgroundColor: 'rgba(201, 25, 11, 0.08)',
    },
  },
  configureModal: {
    '& .pf-v6-c-modal-box': {
      width: '608px',
      maxWidth: '608px',
      height: '326px',
      minHeight: '326px',
    },
    '& .pf-v6-c-modal-box__title, & .pf-v6-c-modal-box__title-text, & .pf-v5-c-modal-box__title, & .pf-v5-c-modal-box__title-text':
      {
        fontSize: '1.25rem !important',
        lineHeight: '1.4 !important',
      },
    '& .pf-v6-c-modal-box__close': {
      display: 'none',
    },
    '& .pf-v5-c-modal-box__close': {
      display: 'none',
    },
    '& .pf-v6-c-button__icon': {
      paddingTop: '5px !important',
      fontSize: '1.25rem !important',
    },
  },
  toggleCell: {
    paddingRight: '0 !important',
  },
  table: {
    width: '100%',
    '& th': {
      borderBottom: 0,
      fontSize: '0.75rem',
      fontWeight: 600,
      color: theme.palette.text.primary,
      whiteSpace: 'nowrap',
      textAlign: 'left',
    },
    '& td': {
      borderBottom: 0,
      paddingTop: theme.spacing(1.5),
      paddingBottom: theme.spacing(1.5),
      verticalAlign: 'middle',
    },
  },
}));

const INITIAL_SERVERS: McpServer[] = [
  {
    id: 'github',
    name: 'Github',
    enabled: true,
    status: 'tokenRequired',
    detail: 'Token required',
    hasSavedToken: false,
  },
  {
    id: 'dynatrace',
    name: 'Dynatrace',
    enabled: false,
    status: 'disabled',
    detail: 'Disabled',
  },
  {
    id: 'openshift',
    name: 'Openshift',
    enabled: true,
    status: 'ok',
    detail: '7 tools',
    hasSavedToken: true,
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    enabled: true,
    status: 'failed',
    detail: '4 tools',
    hasSavedToken: true,
    errorMessage:
      'Token authentication failed, click edit to configure it again',
  },
  {
    id: 'developerhub',
    name: 'Developer Hub',
    enabled: true,
    status: 'ok',
    detail: '5 tools',
    hasSavedToken: true,
  },
  {
    id: 'jenkins',
    name: 'Jenkins',
    enabled: false,
    status: 'disabled',
    detail: 'Disabled',
  },
  {
    id: 'servicenow',
    name: 'Servicenow',
    enabled: true,
    status: 'ok',
    detail: '3 tools',
    hasSavedToken: true,
  },
  {
    id: 'figma',
    name: 'Figma',
    enabled: true,
    status: 'failed',
    detail: 'Failed',
  },
];

const getStatusIcon = (status: ServerStatus, className: string) => {
  if (status === 'tokenRequired') return <KeyIcon className={className} />;
  if (status === 'disabled') return <OffIcon className={className} />;
  if (status === 'failed')
    return <ExclamationCircleIcon className={className} />;
  return <CheckCircleIcon className={className} />;
};

const getDisplayStatus = (server: McpServer): ServerStatus => {
  if (!server.enabled) return 'disabled';
  if (server.status === 'tokenRequired') return 'tokenRequired';
  if (server.status === 'failed') return 'failed';
  if (server.status === 'ok') return 'ok';
  return 'unknown';
};

const getDisplayDetail = (
  server: McpServer,
  displayStatus: ServerStatus,
): string => {
  if (displayStatus === 'disabled') return 'Disabled';
  if (displayStatus === 'tokenRequired') return 'Token required';
  if (displayStatus === 'failed') return server.detail || 'Failed';
  return server.detail;
};

export const McpServersSettings = ({
  onClose,
  backgroundColor,
}: McpServersSettingsProps) => {
  const classes = useStyles();
  const [servers, setServers] = useState<McpServer[]>(INITIAL_SERVERS);
  const [sortAsc, setSortAsc] = useState(true);
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [tokenInputValue, setTokenInputValue] = useState('');
  const [hasSavedTokenInModal, setHasSavedTokenInModal] = useState(false);
  const [tokenValidationState, setTokenValidationState] =
    useState<TokenValidationState>('idle');
  const [tokenValidationMessage, setTokenValidationMessage] = useState('');

  const editingServer = useMemo(
    () => servers.find(server => server.id === editingServerId),
    [servers, editingServerId],
  );

  const selectedCount = useMemo(
    () => servers.filter(server => server.enabled).length,
    [servers],
  );

  const sortedServers = useMemo(() => {
    const next = [...servers];
    next.sort((a, b) =>
      sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
    );
    return next;
  }, [servers, sortAsc]);

  const closeConfigureModal = () => {
    setEditingServerId(null);
    setTokenInputValue('');
    setHasSavedTokenInModal(false);
    setTokenValidationState('idle');
    setTokenValidationMessage('');
  };

  const openConfigureModal = (server: McpServer) => {
    setEditingServerId(server.id);
    const hasSavedToken = Boolean(server.hasSavedToken);
    setHasSavedTokenInModal(hasSavedToken);
    setTokenInputValue(hasSavedToken ? SAVED_TOKEN_MASK : '');
    if (server.status === 'failed' && server.errorMessage) {
      setTokenValidationState('error');
      setTokenValidationMessage(server.errorMessage);
    } else {
      setTokenValidationState('idle');
      setTokenValidationMessage('');
    }
  };

  const onTokenInputChange = (value: string) => {
    if (hasSavedTokenInModal && value !== SAVED_TOKEN_MASK) {
      setHasSavedTokenInModal(false);
    }
    setTokenInputValue(value);
  };

  const clearTokenInput = () => {
    if (hasSavedTokenInModal) {
      setHasSavedTokenInModal(false);
    }
    setTokenInputValue('');
    setTokenValidationState('idle');
    setTokenValidationMessage('');
  };

  const forgetSavedToken = () => {
    setHasSavedTokenInModal(false);
    setTokenInputValue('');
    setTokenValidationState('idle');
    setTokenValidationMessage('');
  };

  useEffect(() => {
    let timer: number | undefined;

    if (!editingServerId) {
      setTokenValidationState('idle');
      setTokenValidationMessage('');
    } else {
      const token = tokenInputValue.trim();
      if (hasSavedTokenInModal && tokenInputValue === SAVED_TOKEN_MASK) {
        setTokenValidationState('idle');
        setTokenValidationMessage('');
      } else if (!token) {
        setTokenValidationState('idle');
        setTokenValidationMessage('');
      } else {
        setTokenValidationState('validating');
        setTokenValidationMessage('Validating connection...');

        timer = window.setTimeout(() => {
          // Mock validation behavior for UI iteration.
          // Replace with backend validate endpoint in integration phase.
          if (token.toLowerCase().includes('bad') || token.length < 6) {
            setTokenValidationState('error');
            setTokenValidationMessage('Authorization failed. Try again.');
          } else {
            setTokenValidationState('success');
            setTokenValidationMessage('Connection successful');
          }
        }, 700);
      }
    }

    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [tokenInputValue, editingServerId, hasSavedTokenInModal]);

  let tokenInputStateClass = '';
  let tokenHelperColor: string | undefined;
  if (tokenValidationState === 'success') {
    tokenInputStateClass = classes.tokenInputSuccess;
    tokenHelperColor = '#3E8635';
  } else if (tokenValidationState === 'error') {
    tokenInputStateClass = classes.tokenInputError;
    tokenHelperColor = '#C9190B';
  }

  let tokenInputAdornment = (
    <IconButton
      aria-label="Clear token input"
      size="small"
      className={classes.tokenClearButton}
      onClick={clearTokenInput}
    >
      <CancelOutlinedIcon
        style={{
          color: '#6A6E73',
          fontSize: 24,
          width: 24,
          height: 24,
        }}
      />
    </IconButton>
  );

  if (tokenValidationState === 'success') {
    tokenInputAdornment = (
      <CheckCircleIcon
        style={{
          color: '#3E8635',
          fontSize: 20,
          width: 20,
          height: 20,
          marginRight: 3,
        }}
      />
    );
  } else if (tokenValidationState === 'error') {
    tokenInputAdornment = (
      <ExclamationCircleIcon
        style={{
          color: '#C9190B',
          fontSize: 20,
          width: 20,
          height: 20,
          marginRight: 3,
        }}
      />
    );
  }

  const saveServerToken = () => {
    if (!editingServerId) return;

    if (hasSavedTokenInModal && tokenInputValue === SAVED_TOKEN_MASK) {
      closeConfigureModal();
      return;
    }

    const hasToken = tokenInputValue.trim().length > 0;
    setServers(prev =>
      prev.map(server => {
        if (server.id !== editingServerId) return server;
        if (!hasToken) {
          return {
            ...server,
            enabled: true,
            status: 'tokenRequired',
            detail: 'Token required',
            hasSavedToken: false,
            errorMessage: undefined,
          };
        }
        return {
          ...server,
          enabled: true,
          status: 'ok',
          detail: '5 tools',
          hasSavedToken: true,
          errorMessage: undefined,
        };
      }),
    );

    closeConfigureModal();
  };

  return (
    <div className={classes.root} style={{ backgroundColor }}>
      <div className={classes.headerRow}>
        <div>
          <Title headingLevel="h2" size="xl" className={classes.title}>
            MCP servers
          </Title>
          <div className={classes.selectedCount}>
            {selectedCount} of {servers.length} selected
          </div>
        </div>
        <Button
          aria-label="Close MCP settings"
          icon={<TimesIcon />}
          variant="plain"
          className={classes.closeButton}
          onClick={onClose}
        />
      </div>

      <Table
        variant="compact"
        aria-label="MCP servers table"
        className={classes.table}
      >
        <Thead>
          <Tr>
            <Th width={10} screenReaderText="Enabled" />
            <Th>
              <Button
                variant="link"
                className={classes.nameHeaderButton}
                icon={sortAsc ? <SortAmountDownIcon /> : <SortAmountUpIcon />}
                iconPosition="right"
                onClick={() => setSortAsc(prev => !prev)}
              >
                <Typography component="span" className={classes.nameHeaderText}>
                  Name
                </Typography>
              </Button>
            </Th>
            <Th className={classes.statusHeader}>Status</Th>
            <Th screenReaderText="Edit" />
          </Tr>
        </Thead>
        <Tbody>
          {sortedServers.map(server => {
            const displayStatus = getDisplayStatus(server);
            const displayDetail = getDisplayDetail(server, displayStatus);
            let statusClass = classes.statusWarn;
            if (displayStatus === 'ok') {
              statusClass = classes.statusOk;
            } else if (displayStatus === 'tokenRequired') {
              statusClass = classes.statusToken;
            } else if (displayStatus === 'disabled') {
              statusClass = classes.statusDisabled;
            }

            return (
              <Tr key={server.id}>
                <Td width={10} className={classes.toggleCell}>
                  {(() => {
                    const isUnavailable =
                      server.status === 'failed' ||
                      server.status === 'tokenRequired';
                    const isChecked = isUnavailable ? false : server.enabled;

                    return (
                      <Switch
                        id={`mcp-switch-${server.id}`}
                        aria-label={`Toggle ${server.name}`}
                        isChecked={isChecked}
                        isDisabled={isUnavailable}
                        onChange={(_event, checked) =>
                          setServers(prev =>
                            prev.map(item =>
                              item.id === server.id
                                ? {
                                    ...item,
                                    enabled: checked,
                                    ...(checked && item.status === 'disabled'
                                      ? { status: 'ok', detail: '5 tools' }
                                      : {}),
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    );
                  })()}
                </Td>
                <Td
                  width={35}
                  className={`${classes.rowName} ${classes.nameCell}`}
                >
                  <Typography component="span" className={classes.nameValue}>
                    {server.name}
                  </Typography>
                </Td>
                <Td width={40} className={classes.statusColumnCell}>
                  <div className={classes.statusCell}>
                    {getStatusIcon(displayStatus, statusClass)}
                    {displayStatus === 'failed' && server.errorMessage ? (
                      <Tooltip content={server.errorMessage}>
                        <Typography
                          component="span"
                          className={classes.statusValue}
                        >
                          {displayDetail}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography
                        component="span"
                        className={classes.statusValue}
                      >
                        {displayDetail}
                      </Typography>
                    )}
                  </div>
                </Td>
                <Td width={15} isActionCell style={{ textAlign: 'right' }}>
                  <Button
                    aria-label={`Edit ${server.name}`}
                    icon={<ModeEditOutlineOutlinedIcon fontSize="small" />}
                    variant="plain"
                    className={classes.actionButton}
                    onClick={() => openConfigureModal(server)}
                  />
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
      <Modal
        variant="small"
        title={`Configure ${editingServer?.name ?? ''} server`}
        isOpen={Boolean(editingServer)}
        onClose={closeConfigureModal}
        className={classes.configureModal}
      >
        <div className={classes.modalContent}>
          <IconButton
            aria-label="Close configure modal"
            size="small"
            className={classes.modalCustomCloseButton}
            onClick={closeConfigureModal}
          >
            <CloseOutlinedIcon />
          </IconButton>
          <div className={classes.modalHeading}>
            <LockIcon />
            <Typography component="div">{`Configure ${editingServer?.name ?? ''} server`}</Typography>
          </div>
          <div className={classes.modalDescription}>
            Credentials are encrypted at rest and scoped to your profile.
            Lightspeed will operate with your exact permissions.
          </div>
          <div className={classes.tokenRow}>
            <TextField
              id="mcp-pat-input"
              type="password"
              variant="outlined"
              fullWidth
              value={tokenInputValue}
              onChange={event => onTokenInputChange(event.target.value)}
              className={`${classes.tokenInput} ${tokenInputStateClass}`}
              label={
                hasSavedTokenInModal ? 'Saved token' : 'Personal Access Token'
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {tokenInputAdornment}
                  </InputAdornment>
                ),
              }}
            />
            {(!hasSavedTokenInModal || tokenValidationState !== 'idle') && (
              <div
                className={classes.tokenHelper}
                style={{ color: tokenHelperColor }}
              >
                {tokenValidationMessage || 'Enter your token'}
              </div>
            )}
          </div>
          <div className={classes.modalActions}>
            <Button
              key="save"
              variant="primary"
              onClick={saveServerToken}
              isDisabled={!tokenInputValue.trim()}
              className={classes.modalActionButton}
            >
              Save
            </Button>
            {hasSavedTokenInModal && (
              <Button
                key="forget-token"
                variant="plain"
                onClick={forgetSavedToken}
                className={classes.forgetTokenButton}
              >
                Forget token
              </Button>
            )}
            <Button
              key="cancel"
              variant="link"
              onClick={closeConfigureModal}
              className={classes.modalCancelButton}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
