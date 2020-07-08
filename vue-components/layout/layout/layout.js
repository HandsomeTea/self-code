import { v4 as uuidv4 } from 'uuid';
import layoutBlock from './block.vue';
import choseDialog from './layoutDialog.vue';

/**
 * 所有布局的组件统一使用的vue实例对象
 **/
export default {
    components: {
        layoutBlock,
        choseDialog
    },
    props: {
        layoutData: {
            required: true,
            type: Object
        },
        conferenceMemberTree: {
            required: true,
            type: Array
        },
        conferenceMemberTile: {
            required: true,
            type: Array
        },
        conferenceMemberMap: {
            required: true,
            type: Object
        },
        isCustomize: {
            required: true,
            type: Boolean
        }
    },
    data() {
        return {
            userMap: this.conferenceMemberMap,
            //所有窗口数据
            windowInfo: {
                isEdited: false,
                layoutId: null,//如果是编辑已经添加的布局，就会有，如果是选择了布局新添加则为null
                hasActiveSpeaker: false,
                list: []
            },
            //当前操作的窗口数据
            operateWindow: {
                settingControl: {
                    dialogModelForFixdUser: '',
                    dialogModelForChoseFixUserByTree: false,
                    dialogModelForPollingUser: [],
                    dialogModelForChosePollingUserByTree: false
                }
            },
            hasLeftMemberLocationOrder: []
        }
    },
    created() {
        const _windowsList = [];
        const lastTimeLayoutSettingData = this.layoutData.settingDetaiMap;
        const sureField = (...settingFiledName) => {
            try {
                return eval(`lastTimeLayoutSettingData${settingFiledName.map(s => `['${s}']`).join('')}`);
            } catch (e) {
                return;
            }
        };

        const self = this;
        this.layoutData.locations.map(window => {
            if (sureField(`order${window.order}`, 'type') === 'ACTIVE_SPEAKER') {
                self.windowInfo.hasActiveSpeaker = true;
            }
            const displayList = [];
            const displayArray = [];

            sureField(`order${window.order}`) && (sureField(`order${window.order}`).displayList || []).map(a => {
                if (self.userMap[a.id]) {
                    displayList.push(a);
                    displayArray.push({
                        id: a.id,
                        name: self.generateDisplayName(self.userMap[a.id])
                    });
                } else {
                    self.hasLeftMemberLocationOrder.push(window.order);
                }
            });
            _windowsList.push({
                windowGroupId: sureField(`order${window.order}`, 'windowGroupId') || uuidv4(),
                type: sureField(`order${window.order}`, 'type') || 'AUTO',
                loopInterval: sureField(`order${window.order}`, 'loopInterval') || '15000',
                windows: {
                    windowId: sureField(`order${window.order}`, 'windows[0]', 'windowId') || uuidv4(),
                    location: window
                },
                displayList,
                displayArray,
                settingControl: {
                    showChoseFixdUserDialog: false,
                    dialogModelForFixdUser: displayList[0] && displayList[0].id || '',
                    dialogModelForChoseFixUserByTree: false,
                    showChosePollingUserDialog: false,
                    dialogModelForPollingUser: displayList,
                    dialogModelForChosePollingUserByTree: false
                }
            });
        });
        this.windowInfo.list = _windowsList;
        if (this.layoutData.layoutId) {
            this.windowInfo.layoutId = this.layoutData.layoutId;
        }
        if (this.hasLeftMemberLocationOrder.length > 0) {
            this.$message({
                type: 'success',
                message: `先前在${this.hasLeftMemberLocationOrder.map(a => `No.${a}`).join(',')}位置设置的显示成员现已不在会议中，可以重新选择！`
            });
        }
    },
    watch: {
        windowInfo: {
            handler() {
                this.$emit('window-setting-change', this.windowInfo);
            },
            deep: true
        }
    },
    computed: {
        layoutClass() {
            return `layout_${this.layoutData.mode}`;
        },
        layoutContentClass() {
            return `conference_layout_common layout_${this.layoutData.mode}_width`;
        }
    },
    methods: {
        generateDisplayName(userOrDevice = {}) {
            const {
                externalDeviceId,
                deviceId,
                userId,
                meetingRoomDevice,
                endpointType,
                dispUserName,
                username,
                name
            } = userOrDevice;
            let _name = null;
            if (userId && !externalDeviceId) { //user
                _name = dispUserName || username || name;
            } else if (userId && externalDeviceId && !meetingRoomDevice) {//user device
                _name = `${dispUserName || username || name}的${endpointType}`;
            } else if (deviceId || externalDeviceId && meetingRoomDevice) {//hard device
                _name = `设备${deviceId || externalDeviceId}`;
            }
            return _name;
        },
        changeBlockDisplayType(displayType) {
            const type = displayType.split(':')[0];
            const windowId = displayType.split(':')[1];
            for (let i = 0; i < this.windowInfo.list.length; i++) {
                if (this.windowInfo.list[i].windows.windowId === windowId && type !== this.windowInfo.list[i].type) {
                    if (type === 'ACTIVE_SPEAKER') {
                        this.windowInfo.hasActiveSpeaker = true;
                    } else if (this.windowInfo.list[i].type === 'ACTIVE_SPEAKER') {
                        this.windowInfo.hasActiveSpeaker = false;
                    }
                    this.windowInfo.list[i].type = type;
                    this.windowInfo.list[i].displayArray = [];
                    this.windowInfo.list[i].displayList = [];
                    this.windowInfo.isEdited = true;
                    break;
                }
            }
        },
        prepareForChoseFixUser(window) {
            this.operateWindow = window;
            this.operateWindow.settingControl.dialogModelForFixdUser = window.displayList[0] && window.displayList[0].id || '';
            this.operateWindow.settingControl.dialogModelForChoseFixUserByTree = false;
            this.operateWindow.settingControl.showChoseFixdUserDialog = true;
        },
        setFixUser(user) {
            for (let s = 0; s < this.windowInfo.list.length; s++) {
                if (this.windowInfo.list[s].windows.windowId === this.operateWindow.windows.windowId && this.operateWindow.type === 'FIX' && this.windowInfo.list[s].type === 'FIX') {
                    this.windowInfo.list[s].displayList = [{ id: user.id, type: user.branchType === 'user' ? 'USER' : 'ENDPOINT' }];
                    this.windowInfo.list[s].displayArray = [user];
                    this.windowInfo.list[s].settingControl.dialogModelForFixdUser = user.id;
                    this.windowInfo.list[s].settingControl.showChoseFixdUserDialog = false;
                    this.windowInfo.isEdited = true;
                    break;
                }
            }
        },
        prepareForChosePollingUser(window) {
            this.operateWindow = window;
            this.operateWindow.settingControl.dialogModelForPollingUser = window.displayList.map(a => a.id);
            this.operateWindow.settingControl.dialogModelForChosePollingUserByTree = false;
            this.operateWindow.settingControl.showChosePollingUserDialog = true;
        },
        setPollingUser(user) {
            for (let s = 0; s < this.windowInfo.list.length; s++) {
                if (this.windowInfo.list[s].windows.windowId === this.operateWindow.windows.windowId && this.operateWindow.type === 'LOOP' && this.windowInfo.list[s].type === 'LOOP') {
                    this.windowInfo.list[s].displayList = user.map(a => { return { id: a.id, type: a.branchType === 'user' ? 'USER' : 'ENDPOINT' } });
                    this.windowInfo.list[s].displayArray = user;
                    this.windowInfo.list[s].settingControl.dialogModelForPollingUser = user.map(a => a.id);
                    this.windowInfo.list[s].settingControl.showChosePollingUserDialog = false;
                    this.windowInfo.isEdited = true;
                    break;
                }
            }
        }
    }
}
