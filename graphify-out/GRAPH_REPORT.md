# Graph Report - .  (2026-05-28)

## Corpus Check
- 3142 files · ~999,999 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2767 nodes · 4464 edges · 371 communities detected
- Extraction: 54% EXTRACTED · 46% INFERRED · 0% AMBIGUOUS · INFERRED: 2065 edges (avg confidence: 0.5)
- Token cost: 5,750 input · 1,700 output

## God Nodes (most connected - your core abstractions)
1. `AgentService` - 57 edges
2. `RunnerService` - 46 edges
3. `AgentSessionState` - 35 edges
4. `TmuxClient` - 34 edges
5. `SessionService` - 33 edges
6. `FakeTmuxClient` - 32 edges
7. `ManagedLoopController` - 26 edges
8. `ZaloPersonalListenerService` - 25 edges
9. `ManagedQueueController` - 22 edges
10. `processChannelInteraction()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `resolveZaloBotConversationRoute()` --calls--> `resolveDirectMessageRoute()`  [INFERRED]
  src/channels/zalo-bot/route-config.ts → src/channels/zalo-personal/route-config.ts
- `resolveGroupRoute()` --calls--> `mergeTelegramGroupRoute()`  [INFERRED]
  src/channels/zalo-personal/route-config.ts → src/channels/telegram/route-config.ts
- `describeZaloBotStartupFailure()` --calls--> `normalizeErrorMessage()`  [INFERRED]
  src/channels/zalo-bot/startup-failure.ts → src/channels/slack/startup-failure.ts
- `describeTelegramStartupFailure()` --calls--> `normalizeErrorMessage()`  [INFERRED]
  src/channels/telegram/startup-failure.ts → src/channels/slack/startup-failure.ts
- `resolveSharedRoute()` --calls--> `buildRoute()`  [INFERRED]
  src/channels/slack/route-config.ts → src/channels/zalo-personal/route-config.ts

## Communities

### Community 64 - "Community 64"
Cohesion: 0.27
Nodes (9): renderCliHelp(), renderRootUsageLines(), renderRootCommandLines(), resolvePairingBaseDir(), resolveConfigPath(), parseChannel(), resolveApprovedBotId(), renderPairingCliHelp() (+1 more)

### Community 138 - "Community 138"
Cohesion: 0.6
Nodes (3): runBuiltinCommand(), runControlCommand(), main()

### Community 201 - "Community 201"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Community 72"
Cohesion: 0.35
Nodes (7): getOwnerUsers(), hasConfiguredOwner(), syncRuntimeStateWithConfig(), primeOwnerClaimRuntime(), isOwnerClaimOpen(), withConfigLock(), claimFirstOwnerFromDirectMessage()

### Community 60 - "Community 60"
Cohesion: 0.31
Nodes (11): mergeRoleDefinitions(), mergeRoleRecord(), normalizeAuthPrincipal(), normalizeRoleUsers(), resolveAuthPrincipal(), findExplicitRole(), getAgentAuth(), getAllowedPermissions() (+3 more)

### Community 219 - "Community 219"
Cohesion: 1.0
Nodes (0): 

### Community 109 - "Community 109"
Cohesion: 0.57
Nodes (6): hasFlag(), parseOptionValue(), parseIntegerOption(), parsePromptCommand(), renderPromptHelp(), runPromptCli()

### Community 110 - "Community 110"
Cohesion: 0.43
Nodes (5): getRunnerSessions(), buildChannelSummary(), getRuntimeOperatorSummary(), deriveHealthSummary(), loadOperatorSummaryConfig()

### Community 124 - "Community 124"
Cohesion: 0.47
Nodes (1): ActivityStore

### Community 139 - "Community 139"
Cohesion: 0.6
Nodes (3): normalizeConfigPath(), suppressConfigReload(), consumeSuppressedConfigReload()

### Community 140 - "Community 140"
Cohesion: 0.6
Nodes (3): buildOwnerAlertCommand(), dedupe(), sendOwnerAlert()

### Community 46 - "Community 46"
Cohesion: 0.23
Nodes (6): isProcessAlive(), summarizeExit(), renderBackoffAlertMessage(), renderStoppedAlertMessage(), RuntimeMonitor, serveMonitor()

### Community 180 - "Community 180"
Cohesion: 1.0
Nodes (2): isLatencyDebugEnabled(), logLatencyDebug()

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (29): resolveConfigPath(), deriveRuntimeSiblingPath(), resolvePidPath(), resolveLogPath(), resolveMonitorStatePath(), resolveLiveMonitorPid(), resolveKnownMonitorPid(), resolveRuntimeCredentialsPath() (+21 more)

### Community 90 - "Community 90"
Cohesion: 0.39
Nodes (2): normalizeErrorMessage(), RuntimeHealthStore

### Community 21 - "Community 21"
Cohesion: 0.16
Nodes (5): buildChannelOwnerAlertKey(), formatElapsedDuration(), renderChannelOwnerAlertMessage(), RuntimeSupervisor, withStartupTimeout()

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (23): formatTime(), renderAgentSummaryLines(), renderAgentSummaryLine(), renderOwnerSummaryLines(), renderTimezoneSummaryLines(), hasConfiguredPrivilegedPrincipal(), renderPrivilegedChatHint(), getEnabledChannelGuidance() (+15 more)

### Community 202 - "Community 202"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 0.16
Nodes (7): listDefaultPairingSetupChannelStates(), resolvePairingSetupChannels(), renderRepoHelpLines(), renderOperatorHelpLines(), renderPairingSetupHelpLines(), renderTmuxDebugHelpLines(), renderChannelSetupHelpLines()

### Community 181 - "Community 181"
Cohesion: 1.0
Nodes (2): renderChannelPrivilegeCliRemovedMessage(), runChannelPrivilegeCli()

### Community 56 - "Community 56"
Cohesion: 0.23
Nodes (11): parseBotType(), parseOptionValue(), getOrCreateBootstrapBot(), ensureUniqueBot(), renderRequiredBootstrapTokens(), renderMixedBootstrapSources(), hasQrBootstrap(), validateBootstrapBot() (+3 more)

### Community 59 - "Community 59"
Cohesion: 0.25
Nodes (11): getQrPath(), parseZaloPersonalProvider(), deriveZaloPersonalBotStatusConnection(), warnIfZaloPersonalListenerStillRunning(), configureZaloPersonalBot(), tryAddZaloPersonalBot(), getZaloPersonalCredentialSource(), loginZaloPersonalBot() (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (31): getEditableConfigPath(), parseRepeatedOption(), parseSingleOption(), hasFlag(), parseScope(), renderAuthCliHelp(), cloneRoleDefinition(), mergeRoleDefinitions() (+23 more)

### Community 6 - "Community 6"
Cohesion: 0.1
Nodes (42): getEditableConfigPath(), getSessionState(), loadLoopControlState(), requireLoopContext(), resolveScopedLoopContext(), listLoops(), showScopedLoopInventory(), cancelLoopById() (+34 more)

### Community 51 - "Community 51"
Cohesion: 0.15
Nodes (5): hasFlag(), parseOptionValue(), parseIntegerOption(), requireConfirm(), resolveZaloPersonalCliContext()

### Community 41 - "Community 41"
Cohesion: 0.32
Nodes (17): getEditableConfigPath(), renderBotsHelp(), parseProvider(), listBots(), addOrSetBotCredentials(), getBot(), setBotEnabled(), removeBot() (+9 more)

### Community 141 - "Community 141"
Cohesion: 0.7
Nodes (4): normalizeClisbotCliName(), getRenderedCliName(), setRenderedCliName(), renderCliCommand()

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (24): getConfigPath(), parseRepeatedOption(), parseAliasedOptionValue(), parseMessageBodyFileOption(), parseMessageAttachmentOption(), parseIntegerOption(), parseMessageFileType(), hasFlag() (+16 more)

### Community 52 - "Community 52"
Cohesion: 0.23
Nodes (14): getOperatorConfigPath(), getPrimaryWorkspacePath(), createShutdown(), registerProcessHandlers(), printStatusSummary(), printDiagnosticsAfterLogTail(), readStartFailureLog(), serveForeground() (+6 more)

### Community 162 - "Community 162"
Cohesion: 0.83
Nodes (3): renderRouteAddSyntaxLines(), renderRouteExampleLines(), renderRoutesHelp()

### Community 26 - "Community 26"
Cohesion: 0.3
Nodes (23): getEditableConfigPath(), parseOptionValue(), hasFlag(), findRouteArgument(), findPositionalArgs(), parseBoolean(), validateRoutePolicy(), parseProvider() (+15 more)

### Community 91 - "Community 91"
Cohesion: 0.39
Nodes (7): isLoopContextValueFlag(), parseOptionValues(), parseOptionValue(), parseBotOptionValue(), stripLoopContextArgs(), parseAddressing(), hasLoopContext()

### Community 203 - "Community 203"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "Community 73"
Cohesion: 0.38
Nodes (10): getDefaultClisbotBinDir(), getDefaultClisbotWrapperPath(), shellQuote(), getClisbotMainScriptPath(), isPackagedRuntime(), getClisbotWrapperPath(), getClisbotPromptCommand(), getClisbotWrapperDir() (+2 more)

### Community 163 - "Community 163"
Cohesion: 0.67
Nodes (2): renderOperatorErrorLines(), renderOperatorErrorWithHelpLines()

### Community 74 - "Community 74"
Cohesion: 0.31
Nodes (6): renderChannelSpecificLoopHelp(), renderChannelTargetingHelp(), renderChannelLoopExamples(), renderLoopHelpExamples(), renderLoopsHelp(), renderLoopsCreateHelp()

### Community 35 - "Community 35"
Cohesion: 0.34
Nodes (20): renderGroupsHelp(), renderGroupAddHelp(), renderGroupMembersHelp(), runGroupsCli(), listGroups(), searchGroups(), handleMembers(), handleGroupInvites() (+12 more)

### Community 164 - "Community 164"
Cohesion: 0.83
Nodes (3): getEditableConfigPath(), renderTimezoneHelp(), runTimezoneCli()

### Community 23 - "Community 23"
Cohesion: 0.16
Nodes (24): getEditableConfigPath(), getSessionState(), loadQueueControlState(), parseQueueCliAddressing(), resolveScopedContext(), enforceQueueCreateLimit(), parseQueueSender(), assertQueueSenderMatchesContext() (+16 more)

### Community 204 - "Community 204"
Cohesion: 1.0
Nodes (0): 

### Community 111 - "Community 111"
Cohesion: 0.43
Nodes (5): selectScopedLoopsForAddressing(), sessionKeyOwnsChildSurface(), buildNewLoopChildSurfaceIntro(), prepareLoopCreateAddressing(), getScopedLoopCounts()

### Community 42 - "Community 42"
Cohesion: 0.31
Nodes (18): renderContactsHelp(), renderFriendInvitesHelp(), runContactsCli(), listContacts(), searchContacts(), getContact(), handleFriendInvites(), sendFriendInvite() (+10 more)

### Community 112 - "Community 112"
Cohesion: 0.43
Nodes (4): findNodeByToken(), normalizeOptionKind(), parseCommandOptions(), executeCommandTree()

### Community 18 - "Community 18"
Cohesion: 0.19
Nodes (25): getEditableConfigPath(), parseRepeatedOption(), parseSingleOption(), hasFlag(), renderAgentsHelp(), parseResponseMode(), parseAdditionalMessageMode(), removeConsumedArgs() (+17 more)

### Community 53 - "Community 53"
Cohesion: 0.28
Nodes (15): hasHelpFlag(), renderBootstrapCommandHelp(), getPrimaryWorkspacePath(), printMissingBootstrapOptions(), hasLiteralMemCredentials(), printMissingFirstRunCredentials(), applyBootstrapStateToConfig(), prepareBootstrapState() (+7 more)

### Community 182 - "Community 182"
Cohesion: 1.0
Nodes (2): renderUpdateHelp(), runUpdateCli()

### Community 81 - "Community 81"
Cohesion: 0.24
Nodes (3): parseOptionValue(), getBotId(), getMutuallyExclusiveAgentArgs()

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (34): renderChannelNativeHelp(), renderChannelNativeMessagesHelp(), renderChannelNativePollsHelp(), renderChannelNativeStickersHelp(), renderHelpBlock(), requireSensitiveConfirm(), channelNativeHelpPath(), runChannelNativeCli() (+26 more)

### Community 142 - "Community 142"
Cohesion: 0.6
Nodes (4): hasFlag(), confirmZaloPersonalBootstrapIfNeeded(), filterZaloPersonalBootstrapBotsNeedingLogin(), loginZaloPersonalBootstrapBots()

### Community 113 - "Community 113"
Cohesion: 0.33
Nodes (3): CliCommandError, printCommandOutcomeBanner(), printCommandOutcomeFooter()

### Community 16 - "Community 16"
Cohesion: 0.17
Nodes (27): parseRepeatedOption(), parseSingleOption(), hasFlag(), parseDurationOption(), parsePositiveIntOption(), parseOptionalPositiveIntOption(), parsePositionalArgument(), isOneOf() (+19 more)

### Community 125 - "Community 125"
Cohesion: 0.4
Nodes (2): buildRunnerSessionMetadata(), listRunnerSessions()

### Community 92 - "Community 92"
Cohesion: 0.42
Nodes (8): shellQuote(), buildCommandString(), sanitizeSessionName(), getRunnerExitRecordPath(), buildRunnerLaunchCommand(), clearRunnerExitRecord(), readRunnerExitRecord(), ensureRunnerExitRecordDir()

### Community 205 - "Community 205"
Cohesion: 1.0
Nodes (1): PNG

### Community 251 - "Community 251"
Cohesion: 1.0
Nodes (0): 

### Community 206 - "Community 206"
Cohesion: 1.0
Nodes (0): 

### Community 183 - "Community 183"
Cohesion: 0.67
Nodes (0): 

### Community 114 - "Community 114"
Cohesion: 0.62
Nodes (6): cloneRestartBackoff(), matchesRestartBackoffShape(), getDefaultRuntimeMonitorRestartBackoff(), normalizeRuntimeMonitorRestartBackoff(), getConfiguredRuntimeMonitorRestartBudget(), getRuntimeMonitorRestartPlan()

### Community 115 - "Community 115"
Cohesion: 0.52
Nodes (5): normalizeTimezone(), parseTimezone(), getHostTimezone(), resolveTimezone(), resolveConfigTimezone()

### Community 184 - "Community 184"
Cohesion: 0.67
Nodes (0): 

### Community 82 - "Community 82"
Cohesion: 0.38
Nodes (9): isDirectMessageWildcardRouteId(), normalizeDirectMessageRouteId(), isExactDirectMessageRouteId(), orderWildcardFirst(), normalizeDirectMessageRouteMap(), normalizeProviderDirectMessageRoutes(), normalizeConfigDirectMessageRoutes(), getProviderBot() (+1 more)

### Community 61 - "Community 61"
Cohesion: 0.29
Nodes (11): isSharedGroupsWildcardRouteId(), normalizeSharedGroupRouteId(), mergeAudienceEntries(), mergeGroupRoute(), resolveSharedGroupsWildcardRoute(), normalizeTopicRoutes(), orderWildcardFirst(), normalizeGroupRouteMap() (+3 more)

### Community 57 - "Community 57"
Cohesion: 0.25
Nodes (9): cloneCommandPrefixes(), cloneSurfaceNotifications(), cloneFollowUp(), cloneBotRoute(), mergeBotRoute(), mergeStandardRoutes(), cloneTopicAwareGroupRoute(), mergeTopicAwareGroupRoute() (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (23): getFirstBotId(), getManagedProviderConfig(), getManagedBotRecords(), getZaloPersonalProviderConfig(), applyZaloPersonalBootstrapBots(), createManagedBotShell(), resolveBootstrapBot(), getBootstrapEnvPlaceholder() (+15 more)

### Community 252 - "Community 252"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Community 65"
Cohesion: 0.29
Nodes (8): requireChannelBotContract(), getChannelManagedProviderConfig(), getChannelBotRecords(), getChannelManagedProviderDefaults(), getChannelManagedBotRecord(), deleteChannelManagedBotRecord(), countChannelManagedBotRoutes(), resolveConfiguredChannelBotId()

### Community 207 - "Community 207"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Community 66"
Cohesion: 0.3
Nodes (10): requireChannelRouteContract(), getChannelRouteProviderConfig(), getChannelRouteBotRecords(), getChannelRouteBotRecord(), createChannelGroupRouteShell(), createChannelTopicRouteShell(), channelSupportsTopicRoutes(), channelSupportsGroupRoutes() (+2 more)

### Community 93 - "Community 93"
Cohesion: 0.39
Nodes (8): resolveDirectMessageWildcardRoute(), resolveDirectMessageExactRoute(), mergeAudienceEntries(), mergeDirectMessageRoute(), stripDirectMessageAdmissionFields(), resolveEffectiveDirectMessageRoute(), createDirectMessageRouteShell(), createDirectMessageBehaviorOverride()

### Community 100 - "Community 100"
Cohesion: 0.39
Nodes (5): createDirectMessageWildcardRoute(), createStandardGroupWildcardRoute(), createTopicGroupWildcardRoute(), createStandardChannelProviderDefaultsTemplate(), createTopicChannelProviderDefaultsTemplate()

### Community 101 - "Community 101"
Cohesion: 0.36
Nodes (4): isRecord(), normalizeBotId(), resolveProvidedBotId(), getConfiguredDefaultBotId()

### Community 67 - "Community 67"
Cohesion: 0.27
Nodes (9): listChannelBotEntries(), listChannelBotSummaries(), listConfiguredChannelBotIds(), getChannelProviderDefaults(), getChannelBotRecord(), requireChannelBotRecord(), resolveChannelBotId(), reconcileChannelProviderDefaults() (+1 more)

### Community 253 - "Community 253"
Cohesion: 1.0
Nodes (0): 

### Community 165 - "Community 165"
Cohesion: 0.67
Nodes (2): createStandardChannelGroupRouteShell(), createTopicAwareChannelGroupRouteShell()

### Community 68 - "Community 68"
Cohesion: 0.29
Nodes (9): createBaseRoute(), createDirectMessageRoute(), renderRouteId(), getRouteContainer(), getTopicGroupRoute(), getOrCreateRoute(), ensureRoute(), removeRouteFromConfig() (+1 more)

### Community 94 - "Community 94"
Cohesion: 0.31
Nodes (4): resolveChannelProviderBotId(), requireChannelProviderBotRecord(), mergeResolvedChannelBotConfig(), resolveChannelProviderBotConfig()

### Community 116 - "Community 116"
Cohesion: 0.38
Nodes (3): loadConfig(), loadConfigWithoutEnvResolution(), materializeLoadedConfig()

### Community 166 - "Community 166"
Cohesion: 0.67
Nodes (2): ensureEditableConfigFile(), readEditableConfig()

### Community 254 - "Community 254"
Cohesion: 1.0
Nodes (0): 

### Community 167 - "Community 167"
Cohesion: 0.83
Nodes (3): applyDynamicPathDefaults(), isRecord(), assertNoLegacyPrivilegeCommands()

### Community 143 - "Community 143"
Cohesion: 0.5
Nodes (2): resolveChannelTemplateConfigMap(), renderDefaultConfigTemplate()

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (29): isRecord(), cloneRecord(), appendMissingStrings(), addSensitiveChannelPermissionsToAdminRole(), addMissingSensitiveChannelAdminPermissions(), parseVersionParts(), isAtMostVersion(), isBeforeVersion() (+21 more)

### Community 144 - "Community 144"
Cohesion: 0.6
Nodes (3): getRawConfig(), resolveBoundAgentId(), resolveTopLevelBoundAgentId()

### Community 54 - "Community 54"
Cohesion: 0.37
Nodes (15): isRecord(), cloneConfig(), areJsonEqual(), nestedRecord(), deleteIfEmpty(), defaultRunner(), isStaleStartupDelay(), deleteStaleStartupDelay() (+7 more)

### Community 255 - "Community 255"
Cohesion: 1.0
Nodes (0): 

### Community 102 - "Community 102"
Cohesion: 0.46
Nodes (7): isRecord(), readSchemaVersion(), logUpgradeStage(), stableConfigText(), renderBackupTimestamp(), reserveBackupPath(), upgradeEditableConfigFileIfNeeded()

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (1): AgentService

### Community 48 - "Community 48"
Cohesion: 0.26
Nodes (1): SurfaceRuntime

### Community 75 - "Community 75"
Cohesion: 0.31
Nodes (7): shouldIncludeTemplateFile(), collectTemplateFiles(), getTemplateFiles(), getBootstrapManagedPaths(), getBootstrapTemplateConflicts(), writeToolDiscoverySymlink(), applyBootstrapTemplate()

### Community 145 - "Community 145"
Cohesion: 0.6
Nodes (3): buildCommandString(), stripWorkspaceArgs(), buildResumeCommandPreview()

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (11): summarizeSnapshot(), isTmuxDuplicateSessionError(), isMissingTmuxSessionError(), isTmuxServerUnavailableError(), isTransientTmuxTargetError(), isBootstrapSessionLostError(), isRecoverableStartupSessionLoss(), isFreshStartRetryablePromptDeliveryError() (+3 more)

### Community 208 - "Community 208"
Cohesion: 1.0
Nodes (0): 

### Community 126 - "Community 126"
Cohesion: 0.6
Nodes (5): extensionFromContentType(), sanitizeAttachmentBaseName(), buildAttachmentFilename(), resolveUniquePath(), saveWorkspaceAttachment()

### Community 146 - "Community 146"
Cohesion: 0.5
Nodes (2): summarizeRemoteAttachmentUrl(), saveRemoteWorkspaceAttachment()

### Community 209 - "Community 209"
Cohesion: 1.0
Nodes (0): 

### Community 147 - "Community 147"
Cohesion: 0.4
Nodes (0): 

### Community 83 - "Community 83"
Cohesion: 0.33
Nodes (7): parseAgentCommand(), hasAgentCommandPrefix(), findMatchingPrefix(), normalizeSlashCommandName(), parseWatchCommand(), parseFollowUpScope(), parseFollowUpSlashCommand()

### Community 103 - "Community 103"
Cohesion: 0.29
Nodes (2): normalizeMessage(), appendRecentConversationMessage()

### Community 185 - "Community 185"
Cohesion: 1.0
Nodes (2): resolveAgentTarget(), resolveAgentTargetInternal()

### Community 186 - "Community 186"
Cohesion: 0.67
Nodes (0): 

### Community 62 - "Community 62"
Cohesion: 0.23
Nodes (2): ClearedQueuedTaskError, AgentJobQueue

### Community 168 - "Community 168"
Cohesion: 0.83
Nodes (3): createQueueId(), summarizeQueuePrompt(), createStoredQueueItem()

### Community 30 - "Community 30"
Cohesion: 0.16
Nodes (1): ManagedQueueController

### Community 5 - "Community 5"
Cohesion: 0.1
Nodes (10): formatObserverError(), isMissingTmuxSessionError(), isTmuxServerUnavailableError(), isBootstrapSessionLostError(), listObserverErrorCodes(), isRetryableObserverDeliveryError(), buildMissingSessionIdStartupWarning(), ActiveRunInProgressError (+2 more)

### Community 187 - "Community 187"
Cohesion: 0.67
Nodes (0): 

### Community 169 - "Community 169"
Cohesion: 0.5
Nodes (0): 

### Community 84 - "Community 84"
Cohesion: 0.29
Nodes (1): SessionStore

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (3): AgentSessionState, getStoredLoops(), getStoredQueues()

### Community 256 - "Community 256"
Cohesion: 1.0
Nodes (0): 

### Community 85 - "Community 85"
Cohesion: 0.44
Nodes (8): normalizeToken(), normalizeMainKey(), normalizeAgentId(), normalizeBotId(), buildAgentMainSessionKey(), resolveLinkedPeerId(), buildAgentPeerSessionKey(), buildTmuxSessionName()

### Community 95 - "Community 95"
Cohesion: 0.22
Nodes (1): SessionMapping

### Community 170 - "Community 170"
Cohesion: 0.5
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 0.19
Nodes (13): parseLoopSlashCommand(), extractLoopStartModifier(), validateLoopStartModifierPlacement(), resolveLoopDayOfWeek(), formatLoopDayOfWeek(), formatCalendarLoopSchedule(), computeNextCalendarLoopRunAtMs(), parseWordDurationMs() (+5 more)

### Community 257 - "Community 257"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 0.19
Nodes (12): createLoopId(), buildStoredLoopSender(), createStoredLoopBase(), deriveLegacyLoopSender(), createStoredIntervalLoop(), createStoredCalendarLoop(), formatLoopLocalDateTime(), renderCalendarFirstRunLine() (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.17
Nodes (1): ManagedLoopController

### Community 210 - "Community 210"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 0.17
Nodes (20): resolvePairingPath(), resolveAllowFromPath(), safeParseJson(), readJsonFile(), writeJsonFile(), ensureJsonFile(), withFileLock(), parseTimestamp() (+12 more)

### Community 127 - "Community 127"
Cohesion: 0.6
Nodes (5): requirePairingAccessContract(), normalizeAllowEntry(), normalizeApprovedPairingId(), isChannelSenderAllowed(), isChannelSenderBlocked()

### Community 148 - "Community 148"
Cohesion: 0.6
Nodes (3): buildPairingReply(), buildPairingQueueFullReply(), buildPairingReplyFromRequest()

### Community 24 - "Community 24"
Cohesion: 0.15
Nodes (24): downloadZaloBotAttachment(), resolveZaloBotAttachmentPaths(), pickTelegramPhoto(), downloadTelegramAttachment(), resolveTelegramAttachmentContentType(), resolveTelegramAttachmentPaths(), resolveTelegramAttachmentMessages(), resolveTelegramSingleMessageAttachmentPaths() (+16 more)

### Community 211 - "Community 211"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 0.09
Nodes (11): extractMentionTargets(), hasZaloBotMention(), hasForeignZaloBotMention(), hasTelegramBotMention(), hasForeignTelegramMention(), stripTelegramBotMention(), escapeRegExp(), extractTelegramMentionTargets() (+3 more)

### Community 149 - "Community 149"
Cohesion: 0.4
Nodes (0): 

### Community 76 - "Community 76"
Cohesion: 0.22
Nodes (4): parseZaloBotTarget(), resolveZaloBotSurface(), parseZaloPersonalTarget(), resolveZaloPersonalSurface()

### Community 77 - "Community 77"
Cohesion: 0.31
Nodes (10): logZaloBotTypingError(), startZaloBotTypingHeartbeat(), beginZaloBotTypingHeartbeat(), logTelegramTypingError(), startTelegramTypingHeartbeat(), beginTelegramTypingHeartbeat(), runWithTelegramTypingHeartbeat(), logZaloPersonalTypingError() (+2 more)

### Community 258 - "Community 258"
Cohesion: 1.0
Nodes (0): 

### Community 150 - "Community 150"
Cohesion: 0.7
Nodes (4): normalizeErrorMessage(), describeZaloBotStartupFailure(), describeTelegramStartupFailure(), describeSlackStartupFailure()

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (15): resolveZaloBotSurfaceNotifications(), resolveZaloBotConfiguredMode(), resolveZaloBotBoundSurfaceRuntimeContext(), resolveTelegramControlSurfaceContext(), resolveTelegramSurfaceNotifications(), resolveTelegramConfiguredMode(), resolveTelegramBoundSurfaceRuntimeContext(), normalizeTelegramControlTarget() (+7 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (11): resolveZaloBotConfig(), resolveZaloBotCredentials(), resolveTelegramBotConfig(), resolveTelegramBotCredentials(), resolveSlackBotConfig(), resolveSlackBotCredentials(), getExistingZaloPersonalTokenFile(), getExistingFollowUp() (+3 more)

### Community 32 - "Community 32"
Cohesion: 0.18
Nodes (21): normalizeLineEndings(), renderZaloBotMarkdownToPlain(), resolveZaloBotMessageContent(), normalizeMarkdownLinks(), renderInlineMarkdownToSlackMrkdwn(), stripMarkdownInline(), normalizeSlackHeaderText(), buildSlackBlocksFallbackText() (+13 more)

### Community 151 - "Community 151"
Cohesion: 0.4
Nodes (0): 

### Community 212 - "Community 212"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 0.15
Nodes (16): ZaloBotApiError, callZaloBotApi(), getZaloBotMe(), getZaloBotUpdates(), sendZaloBotMessage(), sendZaloBotPhoto(), sendZaloBotChatAction(), setZaloBotWebhook() (+8 more)

### Community 69 - "Community 69"
Cohesion: 0.18
Nodes (2): resolveRuntimeSummaryDefaultBot(), resolveRuntimeSummarySurfaceNotifications()

### Community 188 - "Community 188"
Cohesion: 0.67
Nodes (0): 

### Community 70 - "Community 70"
Cohesion: 0.39
Nodes (11): buildRoute(), resolveDirectMessageRoute(), resolveZaloBotConversationRoute(), mergeTelegramGroupRoute(), resolveSharedRouteStatus(), resolveSharedAdmissionStatus(), resolveGroupRoute(), resolveTelegramConversationRoute() (+3 more)

### Community 213 - "Community 213"
Cohesion: 1.0
Nodes (0): 

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (25): dispatchZaloBotUpdates(), ZaloBotPollingService, computeTelegramPollingConflictBackoffDelayMs(), renderTelegramUnroutedRouteMessage(), buildTelegramCommandRegistrations(), dispatchTelegramUpdates(), coalesceTelegramMediaGroupUpdates(), TelegramMediaGroupDispatcher (+17 more)

### Community 117 - "Community 117"
Cohesion: 0.38
Nodes (3): getTelegramGroup(), getOrCreateTelegramTopic(), resolveTelegramTargetBinding()

### Community 259 - "Community 259"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 0.16
Nodes (16): chunkZaloBotText(), postZaloBotText(), reconcileZaloBotText(), getTelegramEditKey(), getTelegramEditThrottleDelayMs(), paceTelegramEdit(), recordTelegramEdit(), buildTelegramTextPayload() (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (40): isTelegramHtmlParseError(), buildTelegramMessagePayload(), parseTelegramChatId(), parseTelegramThreadId(), loadTelegramMedia(), inferTelegramMediaKind(), callTelegramMultipartApi(), sendTelegramMessage() (+32 more)

### Community 78 - "Community 78"
Cohesion: 0.2
Nodes (2): hasSlackNewThreadFlag(), resolveSlackLoopCliAddressing()

### Community 260 - "Community 260"
Cohesion: 1.0
Nodes (0): 

### Community 214 - "Community 214"
Cohesion: 1.0
Nodes (0): 

### Community 96 - "Community 96"
Cohesion: 0.25
Nodes (2): resolveTelegramUnroutedGuidanceMode(), resolveTelegramUnroutedGuidanceModeForEvent()

### Community 63 - "Community 63"
Cohesion: 0.28
Nodes (10): escapeHtml(), sanitizeTelegramHref(), restoreTokens(), applyInlineFormatting(), renderInlineMarkdownToTelegramHtml(), renderHeadingLine(), renderMarkdownLine(), renderMarkdownTextBlock() (+2 more)

### Community 97 - "Community 97"
Cohesion: 0.39
Nodes (6): clampSlackText(), splitLongLine(), splitPlainTextBlock(), splitFencedCodeBlock(), splitSlackBlock(), splitSlackText()

### Community 128 - "Community 128"
Cohesion: 0.67
Nodes (5): logSlackAssistantStatusWarningOnce(), getSlackAssistantStatusErrorMetadata(), buildSlackAssistantStatusRequest(), setSlackAssistantThreadStatus(), clearSlackAssistantThreadStatus()

### Community 261 - "Community 261"
Cohesion: 1.0
Nodes (0): 

### Community 152 - "Community 152"
Cohesion: 0.6
Nodes (3): requireSlackTargetId(), inferSlackSurfaceTarget(), normalizeSlackSurfaceTarget()

### Community 118 - "Community 118"
Cohesion: 0.67
Nodes (6): normalizeSlackReactionName(), isSlackReactionConflict(), logSlackReactionWarningOnce(), getSlackReactionErrorMetadata(), addConfiguredReaction(), removeConfiguredReaction()

### Community 215 - "Community 215"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (17): getChannelPlugin(), requireChannelPlugin(), listRegisteredChannelIds(), isRegisteredChannelId(), renderChannelLabel(), buildChannelDefaultDirectMessageTarget(), resolveChannelInteractionRenderer(), buildChannelPromptSurface() (+9 more)

### Community 189 - "Community 189"
Cohesion: 0.67
Nodes (0): 

### Community 129 - "Community 129"
Cohesion: 0.6
Nodes (5): getEditableConfigPath(), getConversationResponseMode(), setConversationResponseMode(), getConfiguredResponseMode(), setConfiguredResponseMode()

### Community 38 - "Community 38"
Cohesion: 0.28
Nodes (20): isRecord(), cloneRecord(), readString(), copyDefinedFields(), mergeAudienceEntries(), mergeRoute(), normalizeLegacyAllowUsers(), copyLegacyRouteMap() (+12 more)

### Community 130 - "Community 130"
Cohesion: 0.6
Nodes (5): getEditableConfigPath(), getConversationAdditionalMessageMode(), setConversationAdditionalMessageMode(), getConfiguredAdditionalMessageMode(), setConfiguredAdditionalMessageMode()

### Community 131 - "Community 131"
Cohesion: 0.6
Nodes (5): sanitizeInlineCode(), summarizeSurfaceNotificationText(), renderQueueStartNotification(), renderLoopScheduleSegment(), renderLoopStartNotification()

### Community 171 - "Community 171"
Cohesion: 0.83
Nodes (3): getEditableConfigPath(), getConversationStreaming(), setConversationStreaming()

### Community 216 - "Community 216"
Cohesion: 1.0
Nodes (0): 

### Community 172 - "Community 172"
Cohesion: 0.83
Nodes (3): requireSurfaceConfigTargetContract(), resolveConfiguredSurfaceTargetBinding(), buildConfiguredTargetFromIdentity()

### Community 153 - "Community 153"
Cohesion: 0.6
Nodes (3): getEditableConfigPath(), resolveConfiguredFollowUpModeTarget(), setScopedConversationFollowUpMode()

### Community 132 - "Community 132"
Cohesion: 0.4
Nodes (2): mergeRouteAudienceEntries(), mergeSurfaceRouteOverride()

### Community 86 - "Community 86"
Cohesion: 0.27
Nodes (5): createAgentPromptSchema(), createDirectMessagesDefault(), createBaseBotSchema(), createBaseDefaultsSchema(), createBaseDefaults()

### Community 173 - "Community 173"
Cohesion: 0.5
Nodes (0): 

### Community 87 - "Community 87"
Cohesion: 0.33
Nodes (8): resolveSurfacePromptTime(), senderIdFromIdentity(), buildPermissionCheckCommand(), buildSurfacePromptContext(), quoteName(), renderSenderPromptText(), renderSurfacePromptText(), renderSurfacePromptContext()

### Community 88 - "Community 88"
Cohesion: 0.36
Nodes (8): emptyDirectory(), resolveDirectoryPath(), readDirectory(), withDirectoryLock(), enrichSender(), enrichSurface(), buildSurfacePromptContextWithDirectory(), recordSurfaceDirectoryIdentity()

### Community 217 - "Community 217"
Cohesion: 1.0
Nodes (0): 

### Community 218 - "Community 218"
Cohesion: 1.0
Nodes (0): 

### Community 79 - "Community 79"
Cohesion: 0.31
Nodes (5): getZaloPersonalIngressKey(), coalesceZaloPersonalMediaGroupMessages(), ZaloPersonalMediaGroupDispatcher, getZaloPersonalMediaGroupKey(), mergeZaloPersonalMediaGroupMessages()

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (38): loadZcaJs(), renderQrImage(), stripPngDataUrlPrefix(), renderPngAsTerminalQr(), extractQrModules(), findDarkBounds(), inferQrModuleCount(), samplePngAsQrModules() (+30 more)

### Community 43 - "Community 43"
Cohesion: 0.2
Nodes (15): getZaloPersonalMe(), listZaloPersonalContacts(), searchZaloPersonalContacts(), listZaloPersonalFriendInvites(), getZaloPersonalSentFriendRequests(), isZaloEmptyFriendRequestList(), listZaloPersonalGroups(), searchZaloPersonalGroups() (+7 more)

### Community 154 - "Community 154"
Cohesion: 0.6
Nodes (3): resolveZaloPersonalAttachmentSource(), filenameFromUrl(), extensionFromContentType()

### Community 119 - "Community 119"
Cohesion: 0.57
Nodes (6): assertString(), resolveZaloPersonalSessionPath(), readZaloPersonalAuthSession(), writeZaloPersonalAuthSession(), removeZaloPersonalAuthSession(), describeZaloPersonalAuthSession()

### Community 120 - "Community 120"
Cohesion: 0.33
Nodes (2): getZaloPersonalMessageText(), stripZaloPersonalSelfMentions()

### Community 133 - "Community 133"
Cohesion: 0.47
Nodes (3): renderZaloPersonalRiskWarning(), confirmZaloPersonalRisk(), loginConfiguredZaloPersonalBot()

### Community 25 - "Community 25"
Cohesion: 0.15
Nodes (1): ZaloPersonalListenerService

### Community 262 - "Community 262"
Cohesion: 1.0
Nodes (0): 

### Community 220 - "Community 220"
Cohesion: 1.0
Nodes (0): 

### Community 263 - "Community 263"
Cohesion: 1.0
Nodes (0): 

### Community 121 - "Community 121"
Cohesion: 0.33
Nodes (1): ConversationProcessingIndicatorCoordinator

### Community 98 - "Community 98"
Cohesion: 0.33
Nodes (5): parseRepeatedOption(), parseOptionValue(), parseChildSurfaceSelector(), resolveChildSurfaceSelector(), listKnownChildSurfaceFlags()

### Community 221 - "Community 221"
Cohesion: 1.0
Nodes (0): 

### Community 190 - "Community 190"
Cohesion: 0.67
Nodes (0): 

### Community 104 - "Community 104"
Cohesion: 0.32
Nodes (2): OrderedIngressDispatcher, createManualPromise()

### Community 222 - "Community 222"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Community 58"
Cohesion: 0.27
Nodes (14): buildAgentPromptText(), buildSteeringPromptText(), buildChannelPromptText(), resolvePromptContext(), renderMessagePromptParts(), buildReplyStyleHint(), renderLoopHelpCommand(), renderQueueHelpCommand() (+6 more)

### Community 89 - "Community 89"
Cohesion: 0.38
Nodes (1): ProcessedEventsStore

### Community 155 - "Community 155"
Cohesion: 0.4
Nodes (0): 

### Community 156 - "Community 156"
Cohesion: 0.5
Nodes (2): buildRenderedMessageState(), renderPlatformInteraction()

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (22): renderSensitiveCommandDisabledMessage(), renderTranscriptDisabledMessage(), renderStartupSteeringUnavailableMessage(), renderNewSessionFailureMessage(), renderWhoAmIMessage(), renderRouteStatusMessage(), allowTranscriptInspectionForRoute(), renderResponseModeStatusMessage() (+14 more)

### Community 223 - "Community 223"
Cohesion: 1.0
Nodes (0): 

### Community 80 - "Community 80"
Cohesion: 0.29
Nodes (7): getChannelSurfaceContract(), normalizeChannelUserId(), buildNormalizedChannelPrincipal(), renderChannelRouteIdSyntax(), channelSupportsRouteTopics(), channelSupportsRouteGroups(), isLegacyGroupRouteAlias()

### Community 191 - "Community 191"
Cohesion: 0.67
Nodes (0): 

### Community 264 - "Community 264"
Cohesion: 1.0
Nodes (0): 

### Community 224 - "Community 224"
Cohesion: 1.0
Nodes (0): 

### Community 265 - "Community 265"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 0.16
Nodes (12): diffText(), extractScrolledAppend(), deriveRunningInteractionText(), getPromptMarker(), slicePromptBlockFrom(), sliceFromLastPromptBlock(), deriveLatestPromptInteractionSnapshot(), deriveLatestPromptRunningInteractionSnapshot() (+4 more)

### Community 71 - "Community 71"
Cohesion: 0.36
Nodes (11): stripSingleLineAssistantEnvelope(), isProgressBlock(), looksLikePathLikeLine(), looksLikeFilesystemLine(), looksLikeShellCommandLine(), looksLikeOperationalTraceLine(), isMostlyFilesystemBlock(), isToolingBlock() (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.1
Nodes (40): normalizePaneText(), splitNormalizedLines(), trimBlankLines(), collapseBlankLines(), looksLikeUrlContinuation(), isListOrStructuredLine(), shouldJoinWrappedLine(), joinWrappedLines() (+32 more)

### Community 40 - "Community 40"
Cohesion: 0.17
Nodes (13): normalizeBoundaryLine(), extractRenderedIncrement(), selectCompletedInteractionBody(), renderInteractionBody(), startsWithExplicitErrorLabel(), shouldInlineErrorPrefix(), renderErrorInteractionBody(), renderMarkdownRunningInteraction() (+5 more)

### Community 266 - "Community 266"
Cohesion: 1.0
Nodes (0): 

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (36): TmuxBootstrapSessionLostError, TmuxPasteUnconfirmedError, TmuxSubmitUnconfirmedError, submitTmuxSessionInput(), captureTmuxSessionIdentity(), deriveSessionIdCaptureCandidates(), extractStatusCommandTail(), extractSessionIdFromCaptureCandidates() (+28 more)

### Community 174 - "Community 174"
Cohesion: 0.83
Nodes (3): shouldUsePostSubmitBaseline(), appendLatestActiveTimer(), monitorTmuxRun()

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (1): TmuxClient

### Community 105 - "Community 105"
Cohesion: 0.43
Nodes (7): ensureTmuxShellPane(), runTmuxShellCommand(), buildIsolatedBashCommand(), submitShellCommand(), buildShellResult(), stripShellCommandEcho(), escapeRegExp()

### Community 34 - "Community 34"
Cohesion: 0.15
Nodes (17): expandHomePath(), resolveAppHomeDir(), getDefaultConfigPath(), getDefaultStateDir(), getDefaultWorkspaceRoot(), getDefaultCredentialsDir(), getDefaultTmuxSocketPath(), getDefaultProcessedEventsPath() (+9 more)

### Community 175 - "Community 175"
Cohesion: 0.67
Nodes (2): prefixLogLines(), formatTimestampedLogMessage()

### Community 122 - "Community 122"
Cohesion: 0.29
Nodes (0): 

### Community 134 - "Community 134"
Cohesion: 0.47
Nodes (4): commandExists(), runCommand(), readStream(), getExecutableNames()

### Community 267 - "Community 267"
Cohesion: 1.0
Nodes (0): 

### Community 268 - "Community 268"
Cohesion: 1.0
Nodes (0): 

### Community 157 - "Community 157"
Cohesion: 0.4
Nodes (0): 

### Community 269 - "Community 269"
Cohesion: 1.0
Nodes (0): 

### Community 270 - "Community 270"
Cohesion: 1.0
Nodes (0): 

### Community 271 - "Community 271"
Cohesion: 1.0
Nodes (0): 

### Community 272 - "Community 272"
Cohesion: 1.0
Nodes (0): 

### Community 273 - "Community 273"
Cohesion: 1.0
Nodes (0): 

### Community 274 - "Community 274"
Cohesion: 1.0
Nodes (0): 

### Community 225 - "Community 225"
Cohesion: 1.0
Nodes (0): 

### Community 245 - "Community 245"
Cohesion: 1.0
Nodes (0): 

### Community 226 - "Community 226"
Cohesion: 1.0
Nodes (0): 

### Community 275 - "Community 275"
Cohesion: 1.0
Nodes (0): 

### Community 276 - "Community 276"
Cohesion: 1.0
Nodes (0): 

### Community 277 - "Community 277"
Cohesion: 1.0
Nodes (0): 

### Community 278 - "Community 278"
Cohesion: 1.0
Nodes (0): 

### Community 279 - "Community 279"
Cohesion: 1.0
Nodes (0): 

### Community 227 - "Community 227"
Cohesion: 1.0
Nodes (0): 

### Community 192 - "Community 192"
Cohesion: 1.0
Nodes (2): createTarget(), createUpdate()

### Community 280 - "Community 280"
Cohesion: 1.0
Nodes (0): 

### Community 228 - "Community 228"
Cohesion: 1.0
Nodes (0): 

### Community 281 - "Community 281"
Cohesion: 1.0
Nodes (0): 

### Community 229 - "Community 229"
Cohesion: 1.0
Nodes (0): 

### Community 282 - "Community 282"
Cohesion: 1.0
Nodes (0): 

### Community 283 - "Community 283"
Cohesion: 1.0
Nodes (0): 

### Community 284 - "Community 284"
Cohesion: 1.0
Nodes (0): 

### Community 193 - "Community 193"
Cohesion: 0.67
Nodes (0): 

### Community 285 - "Community 285"
Cohesion: 1.0
Nodes (0): 

### Community 286 - "Community 286"
Cohesion: 1.0
Nodes (0): 

### Community 287 - "Community 287"
Cohesion: 1.0
Nodes (0): 

### Community 288 - "Community 288"
Cohesion: 1.0
Nodes (0): 

### Community 230 - "Community 230"
Cohesion: 1.0
Nodes (0): 

### Community 231 - "Community 231"
Cohesion: 1.0
Nodes (0): 

### Community 289 - "Community 289"
Cohesion: 1.0
Nodes (0): 

### Community 232 - "Community 232"
Cohesion: 1.0
Nodes (0): 

### Community 106 - "Community 106"
Cohesion: 0.29
Nodes (2): runCliCommand(), runRunnerCliCommand()

### Community 290 - "Community 290"
Cohesion: 1.0
Nodes (0): 

### Community 158 - "Community 158"
Cohesion: 0.4
Nodes (0): 

### Community 291 - "Community 291"
Cohesion: 1.0
Nodes (0): 

### Community 292 - "Community 292"
Cohesion: 1.0
Nodes (0): 

### Community 293 - "Community 293"
Cohesion: 1.0
Nodes (0): 

### Community 294 - "Community 294"
Cohesion: 1.0
Nodes (0): 

### Community 295 - "Community 295"
Cohesion: 1.0
Nodes (0): 

### Community 296 - "Community 296"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 0.13
Nodes (3): createLoadedConfig(), createZaloBotServiceForTest(), runZaloBotServiceUpdate()

### Community 194 - "Community 194"
Cohesion: 0.67
Nodes (0): 

### Community 297 - "Community 297"
Cohesion: 1.0
Nodes (0): 

### Community 233 - "Community 233"
Cohesion: 1.0
Nodes (0): 

### Community 298 - "Community 298"
Cohesion: 1.0
Nodes (0): 

### Community 299 - "Community 299"
Cohesion: 1.0
Nodes (0): 

### Community 300 - "Community 300"
Cohesion: 1.0
Nodes (0): 

### Community 234 - "Community 234"
Cohesion: 1.0
Nodes (0): 

### Community 235 - "Community 235"
Cohesion: 1.0
Nodes (0): 

### Community 301 - "Community 301"
Cohesion: 1.0
Nodes (0): 

### Community 236 - "Community 236"
Cohesion: 1.0
Nodes (0): 

### Community 302 - "Community 302"
Cohesion: 1.0
Nodes (0): 

### Community 195 - "Community 195"
Cohesion: 0.67
Nodes (0): 

### Community 196 - "Community 196"
Cohesion: 0.67
Nodes (0): 

### Community 303 - "Community 303"
Cohesion: 1.0
Nodes (0): 

### Community 304 - "Community 304"
Cohesion: 1.0
Nodes (0): 

### Community 159 - "Community 159"
Cohesion: 0.5
Nodes (2): createLoadedConfig(), runTelegramServiceUpdate()

### Community 305 - "Community 305"
Cohesion: 1.0
Nodes (0): 

### Community 237 - "Community 237"
Cohesion: 1.0
Nodes (0): 

### Community 176 - "Community 176"
Cohesion: 0.67
Nodes (2): listBuiltInChannelDirectories(), joinCredentialChannels()

### Community 306 - "Community 306"
Cohesion: 1.0
Nodes (0): 

### Community 307 - "Community 307"
Cohesion: 1.0
Nodes (0): 

### Community 308 - "Community 308"
Cohesion: 1.0
Nodes (0): 

### Community 309 - "Community 309"
Cohesion: 1.0
Nodes (0): 

### Community 238 - "Community 238"
Cohesion: 1.0
Nodes (0): 

### Community 310 - "Community 310"
Cohesion: 1.0
Nodes (0): 

### Community 311 - "Community 311"
Cohesion: 1.0
Nodes (0): 

### Community 312 - "Community 312"
Cohesion: 1.0
Nodes (0): 

### Community 313 - "Community 313"
Cohesion: 1.0
Nodes (0): 

### Community 314 - "Community 314"
Cohesion: 1.0
Nodes (0): 

### Community 315 - "Community 315"
Cohesion: 1.0
Nodes (0): 

### Community 239 - "Community 239"
Cohesion: 1.0
Nodes (0): 

### Community 316 - "Community 316"
Cohesion: 1.0
Nodes (0): 

### Community 317 - "Community 317"
Cohesion: 1.0
Nodes (0): 

### Community 318 - "Community 318"
Cohesion: 1.0
Nodes (0): 

### Community 240 - "Community 240"
Cohesion: 1.0
Nodes (0): 

### Community 319 - "Community 319"
Cohesion: 1.0
Nodes (0): 

### Community 241 - "Community 241"
Cohesion: 1.0
Nodes (0): 

### Community 320 - "Community 320"
Cohesion: 1.0
Nodes (0): 

### Community 321 - "Community 321"
Cohesion: 1.0
Nodes (0): 

### Community 322 - "Community 322"
Cohesion: 1.0
Nodes (0): 

### Community 323 - "Community 323"
Cohesion: 1.0
Nodes (0): 

### Community 324 - "Community 324"
Cohesion: 1.0
Nodes (0): 

### Community 197 - "Community 197"
Cohesion: 0.67
Nodes (0): 

### Community 242 - "Community 242"
Cohesion: 1.0
Nodes (0): 

### Community 325 - "Community 325"
Cohesion: 1.0
Nodes (0): 

### Community 326 - "Community 326"
Cohesion: 1.0
Nodes (0): 

### Community 327 - "Community 327"
Cohesion: 1.0
Nodes (0): 

### Community 328 - "Community 328"
Cohesion: 1.0
Nodes (0): 

### Community 329 - "Community 329"
Cohesion: 1.0
Nodes (0): 

### Community 330 - "Community 330"
Cohesion: 1.0
Nodes (0): 

### Community 331 - "Community 331"
Cohesion: 1.0
Nodes (0): 

### Community 198 - "Community 198"
Cohesion: 0.67
Nodes (0): 

### Community 177 - "Community 177"
Cohesion: 0.5
Nodes (0): 

### Community 243 - "Community 243"
Cohesion: 1.0
Nodes (0): 

### Community 244 - "Community 244"
Cohesion: 1.0
Nodes (0): 

### Community 246 - "Community 246"
Cohesion: 1.0
Nodes (0): 

### Community 123 - "Community 123"
Cohesion: 0.29
Nodes (0): 

### Community 160 - "Community 160"
Cohesion: 0.5
Nodes (2): loginQR(), buildQrPngBase64()

### Community 247 - "Community 247"
Cohesion: 1.0
Nodes (0): 

### Community 199 - "Community 199"
Cohesion: 0.67
Nodes (0): 

### Community 248 - "Community 248"
Cohesion: 1.0
Nodes (0): 

### Community 178 - "Community 178"
Cohesion: 0.5
Nodes (0): 

### Community 332 - "Community 332"
Cohesion: 1.0
Nodes (0): 

### Community 333 - "Community 333"
Cohesion: 1.0
Nodes (0): 

### Community 334 - "Community 334"
Cohesion: 1.0
Nodes (0): 

### Community 335 - "Community 335"
Cohesion: 1.0
Nodes (0): 

### Community 336 - "Community 336"
Cohesion: 1.0
Nodes (0): 

### Community 337 - "Community 337"
Cohesion: 1.0
Nodes (0): 

### Community 338 - "Community 338"
Cohesion: 1.0
Nodes (0): 

### Community 339 - "Community 339"
Cohesion: 1.0
Nodes (0): 

### Community 340 - "Community 340"
Cohesion: 1.0
Nodes (0): 

### Community 341 - "Community 341"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (1): FakeTmuxClient

### Community 342 - "Community 342"
Cohesion: 1.0
Nodes (0): 

### Community 343 - "Community 343"
Cohesion: 1.0
Nodes (0): 

### Community 107 - "Community 107"
Cohesion: 0.25
Nodes (0): 

### Community 344 - "Community 344"
Cohesion: 1.0
Nodes (0): 

### Community 345 - "Community 345"
Cohesion: 1.0
Nodes (0): 

### Community 249 - "Community 249"
Cohesion: 1.0
Nodes (0): 

### Community 346 - "Community 346"
Cohesion: 1.0
Nodes (0): 

### Community 347 - "Community 347"
Cohesion: 1.0
Nodes (0): 

### Community 348 - "Community 348"
Cohesion: 1.0
Nodes (0): 

### Community 349 - "Community 349"
Cohesion: 1.0
Nodes (0): 

### Community 350 - "Community 350"
Cohesion: 1.0
Nodes (0): 

### Community 351 - "Community 351"
Cohesion: 1.0
Nodes (0): 

### Community 352 - "Community 352"
Cohesion: 1.0
Nodes (0): 

### Community 353 - "Community 353"
Cohesion: 1.0
Nodes (0): 

### Community 354 - "Community 354"
Cohesion: 1.0
Nodes (0): 

### Community 355 - "Community 355"
Cohesion: 1.0
Nodes (0): 

### Community 356 - "Community 356"
Cohesion: 1.0
Nodes (0): 

### Community 357 - "Community 357"
Cohesion: 1.0
Nodes (0): 

### Community 358 - "Community 358"
Cohesion: 1.0
Nodes (0): 

### Community 359 - "Community 359"
Cohesion: 1.0
Nodes (0): 

### Community 360 - "Community 360"
Cohesion: 1.0
Nodes (0): 

### Community 361 - "Community 361"
Cohesion: 1.0
Nodes (0): 

### Community 179 - "Community 179"
Cohesion: 0.67
Nodes (2): createRawConfig(), createDependencies()

### Community 362 - "Community 362"
Cohesion: 1.0
Nodes (0): 

### Community 363 - "Community 363"
Cohesion: 1.0
Nodes (0): 

### Community 364 - "Community 364"
Cohesion: 1.0
Nodes (0): 

### Community 135 - "Community 135"
Cohesion: 0.33
Nodes (0): 

### Community 365 - "Community 365"
Cohesion: 1.0
Nodes (0): 

### Community 366 - "Community 366"
Cohesion: 1.0
Nodes (0): 

### Community 200 - "Community 200"
Cohesion: 1.0
Nodes (2): createLoadedConfig(), createLoadedConfigAt()

### Community 367 - "Community 367"
Cohesion: 1.0
Nodes (0): 

### Community 250 - "Community 250"
Cohesion: 1.0
Nodes (0): 

### Community 161 - "Community 161"
Cohesion: 0.5
Nodes (2): createUpdate(), createRun()

### Community 368 - "Community 368"
Cohesion: 1.0
Nodes (0): 

### Community 369 - "Community 369"
Cohesion: 1.0
Nodes (0): 

### Community 370 - "Community 370"
Cohesion: 1.0
Nodes (0): 

### Community 136 - "Community 136"
Cohesion: 0.53
Nodes (4): hasChannelsConfigured(), hasAgentConfigured(), displayStatusAndChooseFlow(), runSetupRouter()

### Community 108 - "Community 108"
Cohesion: 0.46
Nodes (6): ask(), askMasked(), runWizardSession(), writeConfig(), startRuntime(), displayReview()

### Community 137 - "Community 137"
Cohesion: 0.33
Nodes (0): 

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (13): WizardCancelled, ask(), isSupportedCliTool(), checkBinaryExists(), getConfiguredChannelNames(), displayConfiguredChannels(), selectCliToolWithVerification(), selectBotType() (+5 more)

### Community 99 - "Community 99"
Cohesion: 0.28
Nodes (9): Feature Task Organization, Authorization System, Pairing Allowlist Alias Cleanup, Audience-Scoped Access, Auth-Aware CLI Mutation Enforcement, Operator Control Surface, Operator Control Surface And Debuggability, Developer and Operator Experience (+1 more)

## Knowledge Gaps
- **1 isolated node(s):** `PNG`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 201`** (2 nodes): `version.ts`, `getClisbotVersion()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 219`** (2 nodes): `defaults.ts`, `createDefaultZaloPersonalDirectMessages()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 202`** (2 nodes): `channels-cli.ts`, `runChannelsCli()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 203`** (2 nodes): `accounts-cli.ts`, `runAccountsCli()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 204`** (2 nodes): `loop-cli-context.ts`, `resolveLoopCliContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 205`** (2 nodes): `pngjs.d.ts`, `PNG`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 251`** (1 nodes): `proper-lockfile.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 206`** (2 nodes): `duration.ts`, `resolveConfigDurationMs()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 252`** (1 nodes): `channel-config-shapes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 207`** (2 nodes): `channel-schema-contract.ts`, `defineChannelSchemaContract()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 253`** (1 nodes): `channel-bootstrap.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 254`** (1 nodes): `schema.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 255`** (1 nodes): `auth-schema.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 208`** (2 nodes): `prompt.ts`, `prependAttachmentMentionsToPrompt()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 209`** (2 nodes): `download.ts`, `downloadRemoteBuffer()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 256`** (1 nodes): `session-runtime.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 257`** (1 nodes): `loop-state.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 210`** (2 nodes): `access-contract.ts`, `normalizePrefixedEntry()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 211`** (2 nodes): `config-template-contract.ts`, `createZaloBotProviderDefaultsTemplate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 258`** (1 nodes): `config-route-contract.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 212`** (2 nodes): `config-schema.ts`, `createChannelBotsSchemaShape()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 213`** (2 nodes): `contract.ts`, `normalizeUserId()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 259`** (1 nodes): `installation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 260`** (1 nodes): `legacy-config-migration-contract.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 214`** (2 nodes): `route-guidance.ts`, `renderTelegramRouteChoiceMessage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 261`** (1 nodes): `bolt-compat.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 215`** (2 nodes): `processing-decoration.ts`, `activateSlackProcessingDecoration()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 216`** (2 nodes): `mention-follow-up.ts`, `buildMentionOnlyFollowUpPrompt()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 217`** (2 nodes): `channel-identity.ts`, `resolveChannelIdentityBotId()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 218`** (2 nodes): `sender-policy.ts`, `resolveZaloPersonalGroupSenderPolicy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 262`** (1 nodes): `service-types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 220`** (2 nodes): `session-path.ts`, `buildDefaultZaloPersonalTokenFile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 263`** (1 nodes): `message-command.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 221`** (2 nodes): `unrouted-guidance-policy.ts`, `shouldGuideUnroutedConversation()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 222`** (2 nodes): `recent-conversation.ts`, `buildRecentConversationMessage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 223`** (2 nodes): `channel-installation-inventory.ts`, `projectInstallations()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 264`** (1 nodes): `channel-plugin.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 224`** (2 nodes): `channel-runtime-identity.ts`, `buildTokenHint()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 265`** (1 nodes): `channel-config-key.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 266`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 267`** (1 nodes): `fast-start.e2e.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 268`** (1 nodes): `message-surface-helpers.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 269`** (1 nodes): `agents-cli.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 270`** (1 nodes): `agent-commands.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 271`** (1 nodes): `unrouted-guidance-policy.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 272`** (1 nodes): `agent-prompt.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 273`** (1 nodes): `auth-cli.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 274`** (1 nodes): `surface-notifications.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 225`** (2 nodes): `runtime-management-cli.test.ts`, `createStatus()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 245`** (2 nodes): `attachments.test.ts`, `buildMessage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 226`** (2 nodes): `shared-route-audience.e2e.test.ts`, `seedConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 275`** (1 nodes): `prompt-cli.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 276`** (1 nodes): `telegram-transport-html-safe.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 277`** (1 nodes): `runner-cli.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 278`** (1 nodes): `runtime-summary.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 279`** (1 nodes): `pairing-messages.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 227`** (2 nodes): `owner-claim.test.ts`, `createConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 280`** (1 nodes): `slack-platform-text.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 228`** (2 nodes): `session-state.test.ts`, `createResolvedTarget()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 281`** (1 nodes): `runner-service.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 229`** (2 nodes): `telegram-route-config.test.ts`, `createLoadedConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 282`** (1 nodes): `telegram-feedback.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 283`** (1 nodes): `recent-message-context.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 284`** (1 nodes): `telegram-html-safe.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 285`** (1 nodes): `processed-events-store.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 286`** (1 nodes): `job-queue.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 287`** (1 nodes): `follow-up-policy.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 288`** (1 nodes): `telegram-typing.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 230`** (2 nodes): `slack-session-routing.test.ts`, `createLoadedConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 231`** (2 nodes): `auth-resolve.test.ts`, `createConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 289`** (1 nodes): `slack-content.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 232`** (2 nodes): `channel-bots.test.ts`, `createConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 290`** (1 nodes): `slack-reactions.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 291`** (1 nodes): `command-tree.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 292`** (1 nodes): `pairing-store.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 293`** (1 nodes): `mention-follow-up.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 294`** (1 nodes): `telegram-api.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 295`** (1 nodes): `tmux-client.integration.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 296`** (1 nodes): `clisbot-wrapper.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 297`** (1 nodes): `update-cli.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 233`** (2 nodes): `slack-service.test.ts`, `createLoadedConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 298`** (1 nodes): `slack-message.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 299`** (1 nodes): `legacy-config-migration.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 300`** (1 nodes): `session-key.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 234`** (2 nodes): `setup-wizard-utils.test.ts`, `makeRl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 235`** (2 nodes): `managed-loop-controller.test.ts`, `createResolvedTarget()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 301`** (1 nodes): `telegram-message.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 236`** (2 nodes): `preload-env.ts`, `restoreSanitizedEnv()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 302`** (1 nodes): `timezone-cli.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 303`** (1 nodes): `cli.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 304`** (1 nodes): `runner-debug-state.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 305`** (1 nodes): `pairing-access.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 237`** (2 nodes): `routes-cli.test.ts`, `seedConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 306`** (1 nodes): `config-template.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 307`** (1 nodes): `logging.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 308`** (1 nodes): `slack-assistant-status.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 309`** (1 nodes): `bootstrap.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 238`** (2 nodes): `queues-cli.test.ts`, `buildConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 310`** (1 nodes): `telegram-message-actions.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 311`** (1 nodes): `channels-cli.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 312`** (1 nodes): `zalo-bot-typing.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 313`** (1 nodes): `env-substitution.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 314`** (1 nodes): `runtime-health-store.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 315`** (1 nodes): `channel-bootstrap-flags.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 239`** (2 nodes): `surface-runtime.test.ts`, `createLoadedConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 316`** (1 nodes): `update-docs.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 317`** (1 nodes): `surface-directory.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 318`** (1 nodes): `channel-surface-contract-registry.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 240`** (2 nodes): `startup-bootstrap.test.ts`, `createConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 319`** (1 nodes): `latency-debug.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 241`** (2 nodes): `runtime-monitor.test.ts`, `createLoadedConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 320`** (1 nodes): `runner-exit-diagnostics.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 321`** (1 nodes): `slack-processing-decoration.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 322`** (1 nodes): `accounts-cli.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 323`** (1 nodes): `slack-manifest.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 324`** (1 nodes): `slack-feedback.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 242`** (2 nodes): `zalo-bot-route-config.test.ts`, `createLoadedConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 325`** (1 nodes): `ordered-ingress-dispatcher.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 326`** (1 nodes): `zalo-bot-message-actions.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 327`** (1 nodes): `channel-rendering.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 328`** (1 nodes): `text-snapshot-diff.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 329`** (1 nodes): `text-cleaning-chrome.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 330`** (1 nodes): `text.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 331`** (1 nodes): `text-rendering-and-final.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 243`** (2 nodes): `setup-channels.test.ts`, `mockReadline()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 244`** (2 nodes): `session-file.test.ts`, `buildSession()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 246`** (2 nodes): `inbound-message.test.ts`, `buildMessage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 247`** (2 nodes): `route-config.test.ts`, `createLoadedConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 248`** (2 nodes): `control-surface.test.ts`, `createLoadedConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 332`** (1 nodes): `agent-service-capture-and-startup-retries.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 333`** (1 nodes): `agent-service-cleanup-and-detached-runs.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 334`** (1 nodes): `agent-service-runtime-reconciliation.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 335`** (1 nodes): `agent-service-trust-and-startup-blockers.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 336`** (1 nodes): `agent-service-calendar-and-follow-up.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 337`** (1 nodes): `agent-service-reuse-and-resume.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 338`** (1 nodes): `agent-service.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 339`** (1 nodes): `agent-service-mid-run-recovery.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 340`** (1 nodes): `agent-service-loops-and-queue.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 341`** (1 nodes): `agent-service-session-identity.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 342`** (1 nodes): `interaction-processing-feedback-and-guards.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 343`** (1 nodes): `interaction-processing-detached-settlement.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 344`** (1 nodes): `interaction-processing-loops-scheduling.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 345`** (1 nodes): `interaction-processing.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 249`** (2 nodes): `interaction-processing-queue-and-steer.suite.ts`, `runExplicitQueuedMessageToolFinalScenario()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 346`** (1 nodes): `interaction-processing-prompt-acceptance.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 347`** (1 nodes): `interaction-processing-message-tool-settlement.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 348`** (1 nodes): `interaction-processing-message-tool-streaming.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 349`** (1 nodes): `interaction-processing-status-and-route-state.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 350`** (1 nodes): `interaction-processing-run-observers.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 351`** (1 nodes): `interaction-processing-route-config-commands.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 352`** (1 nodes): `interaction-processing-queue-inspect-and-new.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 353`** (1 nodes): `interaction-processing-route-modes.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 354`** (1 nodes): `interaction-processing-loops-maintenance.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 355`** (1 nodes): `tmux-runner-latency-monitor-early.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 356`** (1 nodes): `tmux-runner-latency-session-id.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 357`** (1 nodes): `tmux-runner-latency-bootstrap.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 358`** (1 nodes): `tmux-runner-latency.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 359`** (1 nodes): `tmux-runner-latency-monitor-late.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 360`** (1 nodes): `tmux-runner-latency-submit.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 361`** (1 nodes): `message-cli-routes.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 362`** (1 nodes): `message-cli.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 363`** (1 nodes): `loops-cli-scoped-threading.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 364`** (1 nodes): `loops-cli.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 365`** (1 nodes): `loops-cli-basic.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 366`** (1 nodes): `runtime-supervisor.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 367`** (1 nodes): `runtime-supervisor-lifecycle.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 250`** (2 nodes): `runtime-supervisor-owner-alerts.suite.ts`, `waitForMessageCount()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 368`** (1 nodes): `session-service.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 369`** (1 nodes): `session-service-observers-and-recovery.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 370`** (1 nodes): `session-service-active-run-behavior.suite.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ZaloPersonalListenerService` connect `Community 25` to `Community 0`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `PNG` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 6` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 9` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._