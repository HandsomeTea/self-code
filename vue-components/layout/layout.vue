<template>
    <el-main style="padding-top:6px;" id="mettingLayout">
        <template v-if="isFromMettingTemplate">
            <el-link type="primary" class="metting_template_title" :underline="false" @click="redirectToMettingTemplateList"> <i class="el-icon-back"></i> 模板列表 </el-link>
            <el-divider></el-divider>
        </template>

        <!-- 展示布局的部分 -->
        <el-collapse-transition>
            <template v-if="already && choseLayoutType && choseLayoutType !== 'AUTO'">
                <component
                    :is="layout"
                    :layout-data="currentLayoutData"
                    :conference-member-tree="conferenceMemberTreeData"
                    :conference-member-tile="conferenceMemberTileData"
                    :conference-member-map="conferenceMemberMap"
                    :is-customize="hasConferenceMember"
                    @window-setting-change="updateWindowSetting"
                ></component>
            </template>
        </el-collapse-transition>

        <!-- 底部单选，应用到什么范围 -->
        <transition name="el-fade-in-linear">
            <el-row class="layout_use_btn" v-if="choseLayoutType && choseLayoutType !== 'AUTO'">
                <el-radio-group v-model="useType">
                    <el-radio label="allmember">应用到全部与会者</el-radio>
                    <el-radio label="personal">只应用到自己</el-radio>
                    <el-radio label="partmember" v-if="hasConferenceMember">应用到指定与会者</el-radio>
                </el-radio-group>
            </el-row>
        </transition>

        <!-- 选定的要应用的与会人 -->
        <el-collapse-transition>
            <el-row class="layout_use_member" v-if="useType === 'partmember'">
                <el-button class="add_more_user plain_btn" type="primary" plain size="mini" @click="isShowChosePartmentMember">指定应用于...</el-button>

                <el-tag v-for="tag in useList" type="success" :key="tag.name" closable @close="deleteUseUser(tag)">
                    {{ tag.name }}
                </el-tag>
            </el-row>
        </el-collapse-transition>

        <!-- 添加/取消布局设置按钮 -->
        <el-collapse-transition>
            <!-- :style="{ 'margin-left': choseLayoutType === '7X7' ? '1096px' : choseLayoutType === '8X8' ? '1275px' : '835px' }" -->
            <el-row class="use_btn" v-if="choseLayoutType && choseLayoutType !== 'AUTO'">
                <el-button type="primary" size="mini" @click="addLayoutRuleToRuleList">确 &nbsp;&nbsp; 定</el-button>
                <el-button size="mini" type="primary" plain class="plain_btn" @click="isChoseLayout = true">
                    {{ choseLayoutType && choseLayoutType !== "AUTO" ? "选择新布局..." : "添加布局设置..." }}
                </el-button>
                <el-button type="info" size="mini" plain @click="setLayoutType('')">取消并收起</el-button>
            </el-row>
        </el-collapse-transition>

        <!-- 分割线 -->
        <el-divider v-if="choseLayoutType && choseLayoutType !== 'AUTO' && layoutRuleList.length > 0"></el-divider>

        <!-- 布局设置的升序/降序/删除 -->
        <el-collapse-transition v-for="(_layout, b) in layoutRuleList" :key="b">
            <div v-if="already" style="margin-top:10px;transition: all 0.2s;">
                <span class="layout_iteam_order_btn" :markss="_layout.layoutId" @click="changeLayoutSettingLevel(_layout.layoutId, -1)">
                    <i class="el-icon-sort-down" style="font-weight:600;"></i>
                </span>
                <span class="layout_iteam_order_btn" :markss="_layout.layoutId + -1" @click="changeLayoutSettingLevel(_layout.layoutId)">
                    <i class="el-icon-sort-up" style="font-weight:600;"></i>
                </span>
                <span class="layout_iteam_order_btn" @click="deleteLayoutSetting(_layout.layoutId)">
                    <i class="el-icon-delete" style="font-weight:600;"></i>
                </span>
                <!-- layout_iteam_editing -->
                <div :class="['layout_iteam', { layout_iteam_editing: currentLayoutData.layoutId && _layout.layoutId === currentLayoutData.layoutId }]">
                    <el-tooltip content="点击查看，编辑" placement="right" effect="light">
                        <img class="layout_iteam_display_icon" :src="supportLayoutImg[_layout.layout]" @click="editLayoutSetting(_layout)" />
                    </el-tooltip>

                    <el-tooltip
                        placement="top"
                        effect="light"
                        :disabled="translateApplyToWho(_layout.applyTo).title.length <= 118 || _layout.layoutId === currentLayoutData.layoutId"
                    >
                        <div slot="content">
                            <template v-for="(text, i) in translateApplyToWho(_layout.applyTo).splits">
                                {{ text }}
                                <br :key="i" />
                            </template>
                        </div>
                        <p class="layout_iteam_display_description">
                            {{ translateApplyToWho(_layout.applyTo).display }}
                        </p>
                    </el-tooltip>
                </div>
                <div style="clear:both;"></div>
            </div>
        </el-collapse-transition>

        <!-- 确认应用按钮 -->
        <el-collapse-transition>
            <el-row class="use_btn" v-if="!(choseLayoutType && choseLayoutType !== 'AUTO') && already">
                <el-button size="small" type="primary" plain class="plain_btn" @click="isChoseLayout = true">
                    {{ choseLayoutType && choseLayoutType !== "AUTO" ? "选择新布局..." : "添加布局设置..." }}
                </el-button>
                <el-button type="primary" size="small" @click="submitLayoutSetting">应 用</el-button>
            </el-row>
        </el-collapse-transition>

        <!-- 选择布局的对话框 -->
        <el-dialog title="选择布局" :visible.sync="isChoseLayout" width="604px" :close-on-click-modal="false" :close-on-press-escape="false">
            <el-collapse :value="Object.keys(choseLayoutTypeList)">
                <el-collapse-item v-for="(modeType, key) in choseLayoutTypeList" :title="key === 'gallery' ? '画廊模式' : '演讲者模式'" :name="key" :key="key">
                    <div v-for="(mode, i) in modeType" :key="i" @click="setLayoutType(mode)" :class="['layout_image', { layout_image_active: choseLayoutType === mode }]">
                        <img class="layout_icon" :src="supportLayoutImg[mode]" />
                    </div>
                </el-collapse-item>
            </el-collapse>
        </el-dialog>

        <!-- 指定应用与会人员的对话框 -->
        <el-dialog title="选择应用人员" :visible.sync="isChosePartmentMember" width="640px" :close-on-click-modal="false" :close-on-press-escape="false">
            <el-cascader-panel
                ref="chosePartmentMemberCascader"
                :options="conferenceMemberTreeData"
                v-model="useListModel"
                :props="{ emitPath: false, multiple: true }"
            ></el-cascader-panel>

            <el-row class="mt20">
                <el-button class="mr10" type="primary" size="small" @click="setUsePartmentMember">确 定</el-button>
            </el-row>
        </el-dialog>
    </el-main>
</template>
<script>
import { v4 as uuidv4 } from 'uuid';
const layout1X1 = require('../../../../assets/1X1.png');
const layout2X2 = require('../../../../assets/2X2.png');
const layout3X3 = require('../../../../assets/3X3.png');
const layout4X4 = require('../../../../assets/4X4.png');
const layout5X5 = require('../../../../assets/5X5.png');
const layout1X2 = require('../../../../assets/1X2.png');
const layout1TP2H = require('../../../../assets/1TP2H.png');
const layout1TP3H = require('../../../../assets/1TP3H.png');
const layout1TP4H = require('../../../../assets/1TP4H.png');
const layout1TP1H = require('../../../../assets/1TP1H.png');
const layout1TLP5 = require('../../../../assets/1TLP5.png');
const layout1TLP7 = require('../../../../assets/1TLP7.png');
const layout1CP12 = require('../../../../assets/1CP12.png');
const layout2X3 = require('../../../../assets/2X3.png');
const layout3X4 = require('../../../../assets/3X4.png');
const layout6X6 = require('../../../../assets/6X6.png');
const layout7X7 = require('../../../../assets/7X7.png');
const layout8X8 = require('../../../../assets/8X8.png');
const layout1BP2H = require('../../../../assets/1BP2H.png');
const layout1BP3H = require('../../../../assets/1BP3H.png');
const layout1LP2V = require('../../../../assets/1LP2V.png');
const layout1LP3V = require('../../../../assets/1LP3V.png');
const layout1BP4H = require('../../../../assets/1BP4H.png');
const layout1LP4V = require('../../../../assets/1LP4V.png');
const layout1CP16 = require('../../../../assets/1CP16.png');
const layout1CP20 = require('../../../../assets/1CP20.png');
export default {
    data() {
        return {
            isFromMettingTemplate: this.$route.query.f === 't',
            conferenceId: this.$route.query.id,
            conferenceInProgress: false,
            already: false,//初始化数据是否全部加载完毕
            // 布局相关源数据 ==============================================================================布局相关源数据
            isChoseLayout: false,//是否显示选择布局的dialog
            supportLayout: new Set(['1X1', '2X2', '3X3', '4X4', '5X5', '1X2', '1TP2H', '1TP3H', '1TP4H', '1TP1H', '1TLP5', '1TLP7', '1CP12', '2X3', '3X4', '2X1', '3X2', '4X3', '5X4', '4X5', '6X6', '7X7', '8X8', '1BP2H', '1LP2V', '1BP3H', '1LP3V', '1BP4H', '1LP4V', '1CP16', '1CP20',
                /*下面的这些现在不要求支持但是实际已经支持的布局*/
                '1CP14'
            ]),//现在支持的布局类型，不可更改
            supportLayoutImg: {},
            choseLayoutType: '',//当前选中的layout
            isAddNewLayout: true,//是否是添加新布局设置而不是编辑一个已经添加的布局设置
            hasConferenceMember: false,//会议是否有成员
            /** currentLayoutData内容如下：
             *  {
             *      grid: 2
                    locations: Array(4)
                    mode: "2X2"
                    type: 0
                }
            */
            currentLayoutData: {},//当前layou的详细数据
            /** choseLayoutTypeList内容如下
             * {
                    gallery: ['1X1',...],
                    lecturer: ['2X2',...]
                }
             */
            choseLayoutTypeList: {},//所有可选的layout
            /** layoutMap每一项如下：
             * {
             *      AUTO: {
                        grid: (...)
                        locations: (...)
                        mode: (...)
                        type: (...)
                    },
                    1X1:{
                        grid: (...)
                        locations: (...)
                        mode: (...)
                        type: (...)
                    }
                }
             */
            layoutMap: {},//layout的唯一标识(mode)和layout数据的map对照表
            // 人员相关源数据 ================================================================================人员相关源数据
            conferenceMemberTileData: [], //与会所有人平铺的一级树的数据
            /** conferenceMemberTreeData数据结构如下：
             * [{
                id: '1123asd',
                value: '1123asd',
                label: '销售部',
                children: [{
                    id: 'dsd4',
                    value: 'dsd4',
                    label: '张三',
                    name: '张三'
                }]
            }, {
                id: 'dfhfd5',
                value: 'dfhfd5',
                label: '运营部',
                children: [{
                    id: 'asd45',
                    value: 'asd45',
                    label: '李四',
                    name: '李四'
                }, {
                    id: 'asd45ss',
                    value: 'asd45ss',
                    label: '王二',
                    name: '王二'
                }]
            }]
             */
            conferenceMemberTreeData: [],//与会所有人和部门的树状结构数据
            conferenceMemberMap: {},
            hasLeftMember: false,//先前设置时应用到的与会者现在是否还在会议中
            // 指定布局应用到哪些人员相关数据=======================================================指定布局应用到哪些人员相关数据
            isChosePartmentMember: false,//是否显示选择应用人员对话框
            useType: 'allmember',//将布局以什么方式应用(全局，个人，选定人)
            useList: [],//应用到的选定人的列表
            useListModel: [],//当再次编选择应用与会人员的数据时，显示已经选中的树节点而使用的数据，别无他用，是elementUI框架自己需要的格式，不需要关心

            // 设置好的布局数据，也是最终提交需要的数据
            screenSettingData: {},
            //布局规则列表
            layoutRuleList: []
        }
    },
    created() {
        const _map = {};
        for (const _layout of this.supportLayout) {
            try {
                _map[_layout] = eval(`layout${_layout}`);
            } catch (e) { }
        }
        this.supportLayoutImg = _map;
    },
    mounted() {
        //确认界面tab页显示正确
        this.sureView();
        this.getSystemLayout();
    },
    watch: {
        conferenceId() {
            this.sureView();
        },
        //当选中的布局变化时，对应的布局详细数据和轮训规则应该跟着变化
        choseLayoutType() {
            if (!this.choseLayoutType) {
                this.currentLayoutData = {};
            } else {
                if (this.isAddNewLayout === true) {
                    this.currentLayoutData = this.layoutMap[this.choseLayoutType];
                } else {
                    //编辑布局时 currentLayoutData 的赋值在编辑布局的方法里，在这里处理不方便
                    return;
                }
            }

            this.useType = 'allmember';
            this.useList = [];
            this.useListModel = [];
        },
        useType() {
            // 当不是编辑布局设置时，应用到的类型发生变化，useList，useListModel才清空
            if (!this.currentLayoutData.layoutId) {
                this.useList = [];
                this.useListModel = [];
            }
        },
        hasLeftMember() {
            if (this.hasLeftMember) {
                this.$message({
                    type: 'warning',
                    message: '先前设置的某些与会成员现已不在会议中！'
                });
            }
        }
    },
    computed: {
        layout() {
            if (this.choseLayoutType && this.choseLayoutType !== 'AUTO') {
                return resolve => require(['./layout/blockLocate.vue'], resolve);
            }
        }
    },
    methods: {
        redirectToMettingTemplateList() {
            this.$router.replace({ path: '/meetingTemplate', append: true });
        },
        getSystemLayout() {
            //加遮罩，当所有初始化数据加载完再结束加载
            let loading = null;
            if (this.isFromMettingTemplate) {
                loading = this.$loading({
                    lock: true,
                    target: '#mettingLayout'
                });
            } else {
                loading = this.$loading({
                    lock: true,
                    target: '#conferenceControlElement'
                });
            }

            //获取所有布局数据，获取到之后再获取当前会议当前的布局类型，数据初始化才完成
            this.getapi("/api/surpassadm/confmgr/2.0/conference/layout", {}
            ).then(res => {
                const _mapList = {
                    gallery: [],
                    lecturer: []
                }, _map = {};
                const self = this;
                res.data.data.map(a => {
                    if (a.mode !== 'AUTO' && self.supportLayout.has(a.mode)) {//auto布局是默认布局，不用设置，所以不现在在所有可选的layout数据里
                        if (a.type === 'GALLERY') {
                            _mapList.gallery.push(a.mode);
                        } else if (a.type === 'LECTURER') {
                            _mapList.lecturer.push(a.mode);
                        }
                    }
                    _map[a.mode] = a;
                });
                this.choseLayoutTypeList = _mapList;
                this.layoutMap = _map;
                if (this.isFromMettingTemplate) {
                    // 会议模板的布局设置
                    this.getMettingTemplate(loading);
                } else {
                    // 某个会议的布局设置
                    this.getConference(loading);
                }

            }).catch(e => {
                loading.close();
                return this.$message.error("数据初始化失败！");
            });
        },
        //当每个小屏幕设置发生变化时的方法
        updateWindowSetting(windowInfo) {
            this.screenSettingData = windowInfo;
        },
        dealWithConferenceData(conferenceData, loading) {
            const _result = conferenceData;
            const _obj = {};
            const departments = new Set();

            if (_result.status === '1') {
                this.conferenceInProgress = true;
            }

            // userId和user信息的map
            _result.participants = _result.participants || [];
            for (let s = 0; s < _result.participants.length; s++) {
                _obj[_result.participants[s].userId] = _result.participants[s];
                if (_result.participants[s].departmentId) {
                    departments.add(_result.participants[s].departmentId);
                }
            }
            departments.delete('/');

            // 设备Id和设备及人员信息的map
            for (let s = 0; s < (_result.endpoints || []).length; s++) {
                _obj[_result.endpoints[s].externalDeviceId] = _result.endpoints[s];
            }

            if (Object.keys(_obj).length > 0) {
                this.hasConferenceMember = true;
            } else {
                this.$message('没有指定与会者！');
            }

            _obj[this.$store.state.user.userId] = {
                dispUserName: this.$store.state.user.me.name || this.$store.state.user.me.username
            }
            this.conferenceMemberMap = _obj;

            const _arr = [];
            (_result.screens || []).map(a => {
                a.layoutId = uuidv4();
                if (!a.applyTo) {
                    a.applyTo = [];
                }
                _arr.push(a);
            });
            this.layoutRuleList = _arr;

            // 获取部门的信息
            if (departments.size > 0) {
                this.postapi('/api/surpassadm/authmgr/1.0/department/path', {}, {
                    ids: [...departments]
                }).then(response => {
                    this.conferenceMemberTreeData = this.generateTreeStructData(response.data.data.path, response.data.data.departments, _result.participants, _result.endpoints || []);
                    this.already = true;
                    loading.close();
                }).catch(e => {
                    loading.close();
                    return this.$message.error("数据初始化失败！");
                });
            } else {
                this.conferenceMemberTreeData = this.generateTreeStructData([], [], _result.participants, _result.endpoints || []);
                this.already = true;
                loading.close();
            }
        },
        getMettingTemplate(loading) {
            this.getapi(`/api/surpassadm/confmgr/2.0/conference/template/${this.conferenceId}`, {}).then(res => {
                this.dealWithConferenceData(res.data.data, loading);
            }).catch(e => {
                loading.close();
                return this.$message.error("数据初始化失败！");
            });
        },
        // 获取会议的当前布局类型，这时候初始化数据才加载完毕(already才设置为true)
        getConference(loading) {
            this.getapi(`/api/surpassadm/confmgr/2.0/conference/${this.conferenceId}/portal`, {})
                .then(res => {
                    this.dealWithConferenceData(res.data.data, loading);
                }).catch(e => {
                    loading.close();
                    return this.$message.error("数据初始化失败！");
                });
        },
        /*conferenceId可能拿到的为空，这种时候要跳转到会议列表*/
        sureView() {
            if (!this.conferenceId) {
                this.$router.replace({ path: '/conference', append: true });
            }
        },
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
            } else if (!meetingRoomDevice && userId && externalDeviceId) {//user device
                _name = `${dispUserName || username || name}的${endpointType}`;
            } else if (meetingRoomDevice && deviceId || externalDeviceId) {//hard device
                _name = `设备${deviceId || externalDeviceId}`;
            }
            return _name;
        },
        // departmentPath: ['/d1/d2/d3', '/d1/d4/d3/d7', '/d1/d2/d3/d4']，所有的部门路径(树的所有分支)
        // departmentInfoMap: { d1: { name: '销售部', ... }, ... }，每个部门的想详细数据
        // appointmentDeviceAndUserData: [{ _id: '123asd', name: '王二', departmentId: '124e3daswer32', ... }, ...]，每个部门下的用户的详细数据，里面必须带上部门的id
        // onlineDeviceData: [{ userId: '123asd', externalDeviceId: '', type: 'persion-device', deviceType: '', deviceName: '' }]
        generateTreeStructData(departmentPath = [], departmentInfoMap, appointmentDeviceAndUserData, onlineDeviceData) {
            // 获取userId/deviceId(包括预约和在线的)和其详细信息的map数据，其中包含以'hardDevice'为key的硬终端数据
            const userIdAndDeviceIdToDetailMap = {};

            // 预约的人员和设备的处理
            for (let s = 0; s < appointmentDeviceAndUserData.length; s++) {
                const markId = appointmentDeviceAndUserData[s].deviceId || appointmentDeviceAndUserData[s].externalDeviceId || appointmentDeviceAndUserData[s].userId;
                if (markId) {
                    userIdAndDeviceIdToDetailMap[markId] = appointmentDeviceAndUserData[s];
                }
            }

            // 会议正在进行时，在线的人员和设备处理
            for (let s = 0; s < onlineDeviceData.length; s++) {
                onlineDeviceData[s].isOnlineMember = true;
                userIdAndDeviceIdToDetailMap[onlineDeviceData[s].externalDeviceId] = onlineDeviceData[s];
            }
            // userIdAndDeviceIdToDetailMap = {
            //     'eeb912225fd01cf35d33120a': {//user
            //         userId: '',
            //         departmentId: '/',
            //         dispUserName: '',
            //         username: '',
            //         name: ''
            //     },
            //     '81f3078d-a68e-4ad6-8f45-76d4c3b0c80e': {//personalDevice
            //         userId: '',
            //         departmentId: '/',
            //         dispUserName: '',
            //         username: '',
            //         name: '',
            //         externalDeviceId: '',
            //         endpointType: 'PC',
            //         meetingRoomDevice: false,
            //     },
            //     '81f3078d-a68e-4ad6-8f45-76d4c3b0c80e': {//hardDevice
            //         externalDeviceId: '',
            //         endpointType: 'PC',
            //         meetingRoomDevice: true,
            //     }
            // }

            const userIdAndHardDeviceToContainMap = {};
            const departmentIdAndUserIdMap = {};

            for (const key in userIdAndDeviceIdToDetailMap) {
                const {
                    externalDeviceId,
                    deviceId,
                    userId,
                    departmentId,
                    endpointType,
                    dispUserName,
                    username,
                    name,
                    isOnlineMember,
                    meetingRoomDevice
                } = userIdAndDeviceIdToDetailMap[key];
                const userDisplayName = dispUserName || username || name;
                const hardDeviceDisplayName = `设备${deviceId || externalDeviceId}`;
                /**
                 * 会议正在进行时人/设备是否在线
                 * 会议未开始在不在线无意义，所以只判断会议正在进行时的在线状态
                 * 只判断在线的情况(只有一种)，其他情况均认为不在线
                 */
                const status = isOnlineMember && this.conferenceInProgress ? { online: true } : {};//disabled: false

                // 把同一部门的所有用户id总结到一起
                if (departmentId && !departmentIdAndUserIdMap[departmentId]) {
                    departmentIdAndUserIdMap[departmentId] = new Set();
                }
                if (userId && departmentId) {
                    departmentIdAndUserIdMap[departmentId].add(userId);
                }

                // 把每个用户及其终端总结在一起
                if (userId && !userIdAndHardDeviceToContainMap[userId]) {
                    userIdAndHardDeviceToContainMap[userId] = new Set();
                }

                // 所有硬终端总结在一起
                if (meetingRoomDevice && !userId && !userIdAndHardDeviceToContainMap.hardDevice && (deviceId || externalDeviceId)) {
                    userIdAndHardDeviceToContainMap.hardDevice = new Set();
                }

                if (userId) {
                    let user = null, userDevice = null;
                    if (!meetingRoomDevice && externalDeviceId) {// 用户个人终端
                        userDevice = {
                            id: externalDeviceId,
                            value: externalDeviceId,
                            branchType: 'personalDevice',
                            label: `${userDisplayName}的${endpointType}`,// 组件显示使用
                            name: `${userDisplayName}的${endpointType}`,// 选中的人使用
                            ...status
                        }
                    } else if (!externalDeviceId) {// 只有用户(会议还没开始)
                        user = {
                            id: userId,
                            value: userId,
                            branchType: 'user',
                            label: userDisplayName,// 组件显示使用
                            name: userDisplayName,// 选中的人使用
                            ...status
                        }
                    }
                    if (user) {
                        userIdAndHardDeviceToContainMap[userId].add(user);
                    }

                    /**
                     * 如果有该用户的设备，说明会议正在进行且用户有设备上线，这时候就不显示选择用户信息了，只显示用户的设备信息，所以要删除userIdAndDeviceIdToDetailMap[userId]中branchType为user的项
                     * 只有在会议还没开始，或者会议开始了但是用户没有设备上线时，才显示选择用户信息
                     **/
                    if (userDevice) {
                        if (userIdAndDeviceIdToDetailMap[userId]) {
                            const _userDisplayName = userIdAndDeviceIdToDetailMap[userId].dispUserName || userIdAndDeviceIdToDetailMap[userId].username || userIdAndDeviceIdToDetailMap[userId].name
                            const _set = new Set();
                            for (const us of userIdAndHardDeviceToContainMap[userId]) {
                                if (us.branchType !== 'user') {
                                    _set.add(us);
                                }
                            }
                            userIdAndHardDeviceToContainMap[userId] = _set;
                        }
                        userIdAndHardDeviceToContainMap[userId].add(userDevice);
                    }
                } else if (meetingRoomDevice && deviceId || externalDeviceId) { // 硬终端
                    userIdAndHardDeviceToContainMap.hardDevice.add({
                        id: deviceId || externalDeviceId,
                        value: deviceId || externalDeviceId,
                        branchType: 'hardDevice',
                        label: hardDeviceDisplayName,// 组件显示使用
                        name: hardDeviceDisplayName,// 选中的人使用
                        ...status
                    });
                }
            }
            // departmentIdAndUserIdMap = {// 表示每个部门(departmentId代替)下都有哪些用户(userId代替)
            //     '/(departmentId)': new Set(['(userId)'])
            // }
            // userIdAndHardDeviceToContainMap = {
            //     // 表示每个用户(userId代替)的用户信息或该用户的所有在线设备(如果会还没开则是用户信息，会正在进行就是用户的设备)，同时将所有硬终端总结在userIdAndHardDeviceToContainMap.hardDevice下
            //     '5ee19d1a1b11c40a5bcd44e2(userId)': new Set([{
            //         branchType: "personalDevice",
            //         online: true,
            //         disabled: false,
            //         label: "2020@earlystage.com的PC",
            //         name: "2020@earlystage.com的PC",
            //         value: "e3479148-2708-4427-9d8b-448ec52e3298",
            //         id: "e3479148-2708-4427-9d8b-448ec52e3298(deviceId)"
            //     }, {
            //         branchType: "personalDevice",
            //         online: true,
            //         disabled: false,
            //         label: "2021@earlystage.com的PC",
            //         name: "2021@earlystage.com的PC",
            //         value: "ff170c5b-4c35-47c6-b1e4-e0560b20ee23",
            //         id: "ff170c5b-4c35-47c6-b1e4-e0560b20ee23(deviceId)"
            //     }]),
            //     '5ee19fe11b11c4a084cd44e3': new Set([{
            //         branchType: "user",
            //         online: true,
            //         disabled: false,
            //         label: "2021@earlystage.com",
            //         name: "2021@earlystage.com",
            //         value: "5ee19fe11b11c4a084cd44e3",
            //         id: "5ee19fe11b11c4a084cd44e3(userId)"
            //     }]),
            //     hardDevice: new Set([{
            //         branchType: "hardDevice",
            //         online: true,
            //         disabled: false,
            //         label: "2020@earlystage.com的PC",
            //         name: "2020@earlystage.com的PC",
            //         value: "e3479148-2708-4427-9d8b-448ec52e3298",
            //         id: "e3479148-2708-4427-9d8b-448ec52e3298(deviceId)"
            //     }])
            // }

            // 组建树状数据和平铺数据
            let tileResult = [];//平铺的数据结构
            let treeResult = [];//树状数据结构
            const treeLavelAndSamlLevelMemeberIdMap = {};//为防止同样的部门在树的相同层级下重复出现
            for (let index = 0; index < departmentPath.length; index++) {
                const splitDepartment = departmentPath[index].split('/');

                let evalPath = null;
                for (let s = 1; s < splitDepartment.length; s++) {
                    const departmentId = splitDepartment[s];
                    const _temps = {
                        id: departmentId,
                        value: departmentId,
                        label: departmentInfoMap[departmentId].name
                    }
                    if (departmentIdAndUserIdMap[departmentId] && departmentIdAndUserIdMap[departmentId].size > 0) {
                        let underDepartmentAllMember = [];

                        for (const userid of departmentIdAndUserIdMap[departmentId]) {
                            underDepartmentAllMember = [...underDepartmentAllMember, ...userIdAndHardDeviceToContainMap[userid]];
                            tileResult = [...tileResult, ...userIdAndHardDeviceToContainMap[userid]];
                            delete userIdAndHardDeviceToContainMap[userid];
                        }
                        _temps.children = underDepartmentAllMember;
                    }

                    // 如果当前层级没有这个树枝
                    if (!(treeLavelAndSamlLevelMemeberIdMap[`level${s}`] && treeLavelAndSamlLevelMemeberIdMap[`level${s}`].has(departmentId))) {
                        if (s === 1) {//跟层级
                            treeResult.push(_temps);
                            evalPath = `treeResult[${treeResult.length} - 1]`;
                        } else if (s > 1) {
                            eval(evalPath).children = (eval(evalPath).children || []).push(_temp);
                            evalPath = `${evalPath}.children[${evalPath}.children.length - 1]`;
                        }

                        if (!treeLavelAndSamlLevelMemeberIdMap[`level${s}`]) {
                            treeLavelAndSamlLevelMemeberIdMap[`level${s}`] = new Set();
                        }
                        treeLavelAndSamlLevelMemeberIdMap[`level${s}`].add(departmentId);
                    }
                }
            }

            // 添加跟部门的人到第一层级
            const rootDepartmentUser = departmentIdAndUserIdMap['/'];
            if (rootDepartmentUser && rootDepartmentUser.size > 0) {
                for (const userid of departmentIdAndUserIdMap['/']) {
                    treeResult = [...treeResult, ...userIdAndHardDeviceToContainMap[userid]];
                    tileResult = [...tileResult, ...userIdAndHardDeviceToContainMap[userid]];
                    delete userIdAndHardDeviceToContainMap[userid];
                }
            }

            // 添加无部门归属的个人或设备到第一层级
            for (const key in userIdAndHardDeviceToContainMap) {
                if (key !== 'hardDevice') {
                    treeResult = [...treeResult, ...userIdAndHardDeviceToContainMap[key]];
                    tileResult = [...tileResult, ...userIdAndHardDeviceToContainMap[key]];
                }
            }

            // 添加硬终端，硬终端独占一个跟层级
            if (userIdAndHardDeviceToContainMap.hardDevice && userIdAndHardDeviceToContainMap.hardDevice.size > 0) {
                tileResult = [...tileResult, ...userIdAndHardDeviceToContainMap.hardDevice];
                treeResult.push({
                    id: 'endpoints',
                    value: 'endpoints',
                    label: '会议室终端',
                    children: [...userIdAndHardDeviceToContainMap.hardDevice]
                })
            }

            this.conferenceMemberTileData = tileResult;
            return treeResult;
        },
        //设置布局类型
        setLayoutType(mode) {
            if (this.choseLayoutType === mode) {
                this.isChoseLayout = false;
                return;
            }
            this.isAddNewLayout = true;
            if (this.choseLayoutType !== '' && this.choseLayoutType !== 'AUTO' && this.screenSettingData.isEdited === true || mode === '' && this.screenSettingData.isEdited === true) {
                this.$confirm(mode === '' ? '当前设置不会保存，确认要取消收起吗？' : '当前设置不会保存，确认要切换布局吗？', '注意', {
                    confirmButtonText: this.$t('message.Login.Certain'),
                    cancelButtonText: this.$t('message.Login.Cancel'),
                    type: "warning"
                }).then(() => {
                    this.choseLayoutType = mode;
                    this.isChoseLayout = false;
                }).catch(() => { });
            } else {
                this.choseLayoutType = mode;
                this.isChoseLayout = false;
            }
        },
        //显示选择要应用到的与会人的对话框
        isShowChosePartmentMember() {
            this.useListModel = this.useList.map(i => i.id);
            this.isChosePartmentMember = true;
        },
        //设置要应用的与会人员
        setUsePartmentMember() {
            const user = [];
            this.$refs.chosePartmentMemberCascader.getCheckedNodes().map(node => {
                if (!node.data.children) {
                    user.push(node.data);
                }
            });
            this.useList = user;
            this.isChosePartmentMember = false;
        },
        // 删除useList中的一项
        deleteUseUser(userObj) {
            const arr = [], arrModel = [];
            this.useList.map(user => {
                if (user.id !== userObj.id) {
                    arr.push(user);
                    arrModel.push(user.id);
                }
            });
            this.useList = arr;
            this.useListModel = arrModel;
        },
        translateApplyToWho(applyTo) {
            let title = '';
            if (applyTo.length === 0) {
                title = '应用到全部与会者。';
            } else {
                const displayUserNames = applyTo.map(a => {
                    if (a.id === this.$store.state.user.userId) {
                        return '我自己';
                    } else {
                        const _display = this.generateDisplayName(this.conferenceMemberMap[a.id]);
                        if (_display) {
                            return _display;
                        } else {
                            this.hasLeftMember = true
                            return a.type === 'USER' ? '[该人员已离会]' : a.type === 'ENDPOINT' ? '[该终端已离会]' : '[已离会]';
                        }
                    }
                }).join(",")
                title = `应用到：${displayUserNames}。`;
            }

            // 分行显示
            let splits = title.match(/(.{50})/g) || [];

            splits.push(title.replace(splits.join(''), ''));
            return {
                title,
                display: title.length > 118 ? `${title.substring(0, 117)}......` : title,
                splits
            };
        },
        editLayoutSetting(_editLayout) {
            this.isAddNewLayout = false;
            this.choseLayoutType = _editLayout.layout;
            const settingDetaiMap = {};
            this.currentLayoutData = {
                layoutId: _editLayout.layoutId,
                grid: this.layoutMap[_editLayout.layout].grid,
                locations: _editLayout.windowGroups.map(s => {
                    settingDetaiMap[`order${s.windows[0].location.order}`] = s;
                    return s.windows[0].location;
                }),
                mode: _editLayout.layout,
                type: this.layoutMap[_editLayout.layout].type,
                settingDetaiMap
            };
            if (!_editLayout.applyTo) {
                _editLayout.applyTo = [];
            }
            if (_editLayout.applyTo.length === 1 && _editLayout.applyTo[0].id === this.$store.state.user.userId) {
                this.useType = 'personal';
            } else if (_editLayout.applyTo.length === 0) {
                this.useType = 'allmember';
            } else {
                this.useType = 'partmember';
                const _arr = [];
                _editLayout.applyTo.map(s => {
                    if (this.conferenceMemberMap[s.id]) {
                        _arr.push({
                            id: s.id,
                            name: this.generateDisplayName(this.conferenceMemberMap[s.id])
                        });
                    }
                });
                this.useList = _arr;
                this.useListModel = _arr.map(a => a.id);
            }
        },
        // 添加一个布局设置到布局列表
        addLayoutRuleToRuleList() {
            let warningText = '';
            let useInfoList = [];

            if (this.useType === 'personal' || this.useList.length === 1 && this.$store.state.user.userId === this.useList[0].id) {
                this.useType = 'personal';
                warningText = '布局设置会应用到你个人的客户端，即时生效，确认应用吗？';
                useInfoList = [{ id: this.$store.state.user.userId, type: 'USER' }];
            } else if (this.useType === 'allmember') {
                warningText = '布局设置会应用到当前会议所有的客户端，即时生效，确认应用吗？'
            } else if (this.useType === 'partmember' && this.useList.length > 0) {
                warningText = '布局设置会应用到选中的与会人员客户端，即时生效，确认应用吗？'
                useInfoList = this.useList.map(u => {
                    return {
                        id: u.id,
                        type: u.branchType === 'user' ? 'USER' : 'ENDPOINT'
                    };
                });
            } else if (this.useType === 'partmember' && this.useList.length === 0) {
                return this.$message.error("请选择要应用的与会人员");
            }

            const self = this;
            // this.$confirm(warningText, '注意', {
            //     confirmButtonText: this.$t('message.Login.Certain'),
            //     cancelButtonText: this.$t('message.Login.Cancel'),
            //     type: "warning"
            // }).then(() => {
            if (this.supportLayout.has(this.choseLayoutType)) {
                const oneLayoutFinalData = {
                    layoutId: this.screenSettingData.layoutId || uuidv4(),
                    screenId: uuidv4(),
                    conferenceId: this.conferenceId,
                    layout: this.choseLayoutType,
                    grid: this.currentLayoutData.grid,
                    windowGroups: [],
                    // [{
                    //     windowGroupId: this.generateRandomId(),
                    //     type: 'AUTO',// AUTO, ACTIVE_SPEAKER, FIX, LOOP
                    //     loopInterval: '15000',
                    //     windows: [{
                    //         windowId: this.generateRandomId(),
                    //         location: {
                    //             order: 1,
                    //             top: 0,
                    //             bottom: 0,
                    //             left: 0,
                    //             right: 1
                    //         },
                    //     }],
                    //     displayList: [],
                    //     displayArray: [],
                    //     settingControl: {
                    //         showChoseFixdUserDialog: false,
                    //         dialogModelForFixdUser: '',
                    //         dialogModelForChoseFixUserByTree: false,
                    //         showChosePollingUserDialog: false,
                    //         dialogModelForPollingUser: [],
                    //         dialogModelForChosePollingUserByTree: false
                    //     }
                    // }],
                    applyTo: useInfoList
                }

                if (this.hasConferenceMember) {
                    const settings = this.screenSettingData.list;
                    const result = [];
                    let hasWrongData = false;

                    for (let i = 0; i < settings.length; i++) {
                        const _screen = {
                            windowGroupId: settings[i].windowGroupId,
                            type: settings[i].type || 'AUTO',
                            loopInterval: settings[i].type === 'LOOP' ? settings[i].loopInterval : '',
                            windows: [{
                                windowId: settings[i].windows.windowId,
                                location: settings[i].windows.location
                            }],
                            displayList: settings[i].displayList
                        };
                        if (_screen.type === 'FIX' && _screen.displayList.length === 1 || _screen.type === 'LOOP' && _screen.displayList.length >= 1 && new Set(['15000', '60000', '180000', '300000']).has(settings[i].loopInterval)) {
                            result.push(_screen);
                        } else if (_screen.type === 'AUTO' || _screen.type === 'ACTIVE_SPEAKER') {
                            _screen.loopInterval = '';
                            _screen.displayList = [];
                            result.push(_screen);
                        } else {
                            _screen.type = 'AUTO';
                            _screen.loopInterval = '';
                            _screen.displayList = [];
                            result.push(_screen);
                            hasWrongData = true;
                        }
                    }
                    oneLayoutFinalData.windowGroups = result;

                    if (hasWrongData) {
                        this.$message({
                            type: "warning",
                            message: '没有高亮的小屏幕都将按照"自动"显示处理，如需更改请重新编辑。'
                        });
                    }
                } else {
                    oneLayoutFinalData.windowGroups = this.currentLayoutData.locations.map(window => {
                        return {
                            windowGroupId: uuidv4(),
                            type: 'AUTO',
                            loopInterval: '',
                            windows: [{
                                windowId: uuidv4(),
                                location: window
                            }],
                            displayList: []
                        }
                    });
                }
                // console.log(oneLayoutFinalData);
                if (this.screenSettingData.layoutId) {//设置好的layout有 layoutId 说明是编辑原来设置好的数据，没有说明是添加新的布局设置
                    for (let s = 0; s < this.layoutRuleList.length; s++) {
                        if (this.layoutRuleList[s].layoutId === this.screenSettingData.layoutId) {
                            this.layoutRuleList[s] = oneLayoutFinalData;
                            break;
                        }
                    }
                } else {
                    this.layoutRuleList.push(oneLayoutFinalData);
                }

                this.choseLayoutType = '';
            }
            // });
        },
        // 删除某一个布局设置
        deleteLayoutSetting(_layoutId) {
            this.$confirm('确定删除指定设置的布局吗？', '注意', {
                confirmButtonText: this.$t('message.Login.Certain'),
                cancelButtonText: this.$t('message.Login.Cancel'),
                type: "warning"
            }).then(() => {
                const _array = [];

                this.layoutRuleList.map(a => {
                    if (a.layoutId !== _layoutId) {
                        _array.push(a);
                    }
                });
                this.layoutRuleList = _array;
                if (this.currentLayoutData.layoutId === _layoutId) {
                    this.choseLayoutType = '';
                }
            });
        },
        // 改变布局设置的优先级
        changeLayoutSettingLevel(_layoutId, sort) {
            // 获取被调整的数据和其在数组中的位置(index)
            let index = 0;
            let operateLayoutData = {};
            for (let s = 0; s < this.layoutRuleList.length; s++) {
                if (_layoutId === this.layoutRuleList[s].layoutId) {
                    index = s;
                    operateLayoutData = this.layoutRuleList[s];
                    break;
                }
            }

            //获取要和被调整数据对换位置的数据
            let beChangedLayoutLevelData = null;

            if (sort === -1) {//降低优先级
                if (index === this.layoutRuleList.length - 1) {
                    return;
                }
                beChangedLayoutLevelData = this.layoutRuleList[index + 1];
            } else {
                if (index === 0) {
                    return;
                }
                beChangedLayoutLevelData = this.layoutRuleList[index - 1];
            }

            // 生成新的顺序
            const result = [];

            for (let s = 0; s < this.layoutRuleList.length; s++) {
                if (s === index) {
                    this.layoutRuleList[s] = beChangedLayoutLevelData;
                }
                if (sort === -1 && s === index + 1) {//降低优先级
                    this.layoutRuleList[s] = operateLayoutData;
                }
                if (sort !== -1 && s === index - 1) {
                    this.layoutRuleList[s] = operateLayoutData;
                }

                result.push(this.layoutRuleList[s]);
            }
            this.layoutRuleList = result;
            // 成功
            this.$message({
                message: '优先级调整成功！',
                type: 'success'
            });
        },
        // 提交布局设置
        submitLayoutSetting() {
            const self = this;
            const _putServer = () => {
                let loading = null;
                let apiAddr = null;
                if (self.isFromMettingTemplate) {
                    loading = self.$loading({
                        lock: true,
                        target: '#mettingLayout'
                    });
                    apiAddr = `/api/surpassadm/confmgr/2.0/conference/template/${self.conferenceId}`
                } else {
                    loading = self.$loading({
                        lock: true,
                        target: '#conferenceControlElement'
                    });
                    apiAddr = `/api/surpassadm/confmgr/2.0/conference/${self.conferenceId}/control/screen`;
                }

                self.putapi(apiAddr, {}, {
                    screens: self.layoutRuleList
                }).then(() => {
                    self.$message({
                        message: '提交成功！',
                        type: 'success'
                    });
                    loading.close();
                    if (self.isFromMettingTemplate) {
                        self.redirectToMettingTemplateList()
                    }
                }).catch(() => {
                    self.$message.error("保存失败，请稍后重试");
                    loading.close();
                })
            }

            if (self.layoutRuleList.length === 0) {
                this.$confirm('确定不添加任何布局设置吗？不设置任何布局，客户端展示将完全不受限制。', '注意', {
                    confirmButtonText: this.$t('message.Login.Certain'),
                    cancelButtonText: this.$t('message.Login.Cancel'),
                    type: "warning"
                }).then(() => {
                    _putServer();
                });
            } else {
                _putServer();
            }
        }
    }
}
</script>
<style scoped>
.layout_use_btn {
    margin-top: 17px;
    line-height: 30px;
}
.layout_use_member {
    line-height: 30px;
}
.layout_use_member > .el-tag:first-child {
    margin-left: 0;
}

.layout_icon,
.layout_image {
    width: 60px;
    height: 45px;
    line-height: 45px;
}

.layout_image {
    float: left;
    padding: 5px;
    display: block;
    text-align: center;
    margin: 12px;
    font-size: 60px;
    color: #409eff;
    border-radius: 7px;
    transition: all 0.3s;
}
.layout_image:hover,
.layout_image_active {
    cursor: pointer;
    box-shadow: 0 0 12px 0 #003cff;
}
.use_btn {
    margin-top: 22px;
}
.add_more_user {
    margin-top: 16px;
    padding-top: 9px;
    padding-bottom: 9px;
}

.layout_custom_play {
    margin: 18px 10px 0 2px;
}

.layout_iteam {
    background-color: #f4f4f5;
    color: #909399;
    padding: 0 3px;
    margin-left: 10px;
    height: 44px;
    box-sizing: border-box;
    border-radius: 8px;
    overflow: hidden;
    opacity: 1;
    display: flex;
    align-items: center;
    transition: opacity 0.2s;
    max-width: 800px;
    min-width: 300px;
    transition: all 0.3s;
    float: left;
}
.layout_iteam_editing {
    background-color: #f0f9eb;
    color: #67c23a;
}
.layout_iteam_display_icon {
    height: 32px;
    cursor: pointer;
    margin-left: 4px;
}
.layout_iteam_display_description {
    line-height: 18px;
    max-height: 36px;
    overflow: hidden;
    margin: 0;
    padding: 0 6px;
    /* text-indent: 2em; */
}
.layout_iteam_order_btn {
    display: block;
    float: left;
    line-height: 28px;
    padding: 0 10px;
    margin-top: 7px;
    font-size: 16px;
    cursor: pointer;
    color: #409eff;
    background: #ecf5ff;
    border: 1px solid #b3d8ff;
}
.layout_iteam_order_btn:nth-child(1) {
    border-top-left-radius: 12px;
    border-bottom-left-radius: 12px;
    padding-right: 5px;
}
.layout_iteam_order_btn:nth-child(2) {
    border-top-right-radius: 12px;
    border-bottom-right-radius: 12px;
    border-left: none;
    padding-left: 5px;
}
.layout_iteam_order_btn:nth-child(3) {
    color: #f56c6c;
    background: #fef0f0;
    border: 1px solid #fbc4c4;
    margin-left: 10px;
    border-radius: 8px;
    padding: 0 14px;
}
.layout_iteam_order_btn:hover {
    color: #fff;
    background-color: #597ef7;
    border-color: #597ef7;
    transition: all 0.3s;
}
.layout_iteam_order_btn:nth-child(3):hover {
    color: #fff;
    background-color: #f56c6c;
    border-color: #f56c6c;
}
.metting_template_title {
    font-size: 16px;
    line-height: 30px;
    margin-bottom: -15px;
}
.mr10 {
    margin-right: 10px;
}
.mt20 {
    margin-top: 20px;
}
.fr {
    float: right;
}
</style>
