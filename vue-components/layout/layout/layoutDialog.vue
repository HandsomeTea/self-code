<template>
    <div class="dialog_contain">
        <!-- 选择固定显示的会议人员的对话框 -->
        <el-dialog
            :title="`为No.${operateWindow.windows && operateWindow.windows.location.order}选择显示内容`"
            :visible.sync="operateWindow.settingControl && operateWindow.settingControl.showChoseFixdUserDialog"
            width="640px"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
        >
            <div style="margin-bottom: 8px;">
                <el-checkbox v-model="operateWindow.settingControl.dialogModelForChoseFixUserByTree" border size="mini">按照部门层级选择</el-checkbox>
                <el-input
                    v-if="!operateWindow.settingControl.dialogModelForChoseFixUserByTree"
                    class="cascader_search_input"
                    v-model="searchKeyword"
                    placeholder="关键字搜索"
                ></el-input>
            </div>
            <el-cascader-panel
                v-show="operateWindow.settingControl.dialogModelForChoseFixUserByTree"
                ref="choseFixUserCascader"
                :options="treeData"
                @change="noticeFixUserData"
                v-model="operateWindow.settingControl.dialogModelForFixdUser"
                :props="{ emitPath: false }"
            ></el-cascader-panel>

            <el-cascader-panel
                v-show="!operateWindow.settingControl.dialogModelForChoseFixUserByTree"
                ref="choseFixUserCascader1"
                :options="memberList"
                @change="noticeFixUserData"
                v-model="operateWindow.settingControl.dialogModelForFixdUser"
                :props="{ emitPath: false }"
            ></el-cascader-panel>
        </el-dialog>

        <!-- 选择队列轮询的会议人员的对话框 -->
        <el-dialog
            :title="`为No.${operateWindow.windows && operateWindow.windows.location.order}选择轮询内容`"
            :visible.sync="operateWindow.settingControl && operateWindow.settingControl.showChosePollingUserDialog"
            width="640px"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
        >
            <div style="margin-bottom: 8px;">
                <el-checkbox style="float:left;" v-model="operateWindow.settingControl.dialogModelForChosePollingUserByTree" border size="mini">按照部门层级选择</el-checkbox>
                <el-input
                    v-if="!operateWindow.settingControl.dialogModelForChosePollingUserByTree"
                    class="cascader_search_input"
                    v-model="searchKeyword"
                    placeholder="关键字搜索"
                ></el-input>
                <div style="clear:both;"></div>
            </div>

            <el-cascader-panel
                v-show="operateWindow.settingControl.dialogModelForChosePollingUserByTree"
                ref="chosePollingUserCascader"
                :options="treeData"
                v-model="operateWindow.settingControl.dialogModelForPollingUser"
                :props="{ emitPath: false, multiple: true }"
            ></el-cascader-panel>

            <el-cascader-panel
                v-show="!operateWindow.settingControl.dialogModelForChosePollingUserByTree"
                ref="chosePollingUserCascader1"
                :options="memberList"
                v-model="operateWindow.settingControl.dialogModelForPollingUser"
                :props="{ emitPath: false, multiple: true }"
            ></el-cascader-panel>

            <div style="margin-top: 8px;">
                轮询间隔选择：
                <el-radio-group v-model="operateWindow.loopInterval" size="mini">
                    <el-radio-button label="15000">每15秒</el-radio-button>
                    <el-radio-button label="60000">每60秒</el-radio-button>
                    <el-radio-button label="180000">每3分钟</el-radio-button>
                    <el-radio-button label="300000">每5分钟</el-radio-button>
                </el-radio-group>
            </div>

            <el-row style="margin-top:24px;">
                <el-button type="primary" size="small" @click="noticePollingUserData">确定</el-button>
            </el-row>
        </el-dialog>
    </div>
</template>

<script>
export default {
    props: {
        operateWindow: {
            required: true,
            type: Object
        },
        treeData: {
            required: true,
            type: Array
        },
        tileData: {
            required: true,
            type: Array
        }
    },
    data() {
        return {
            searchKeyword: '',
            memberList: []
        }
    },
    created() {
        this.searchConferenceMember();
    },
    watch: {
        searchKeyword() {
            this.searchConferenceMember();
        }
    },
    computed: {

    },
    methods: {
        noticeFixUserData() {
            let user = null;

            if (this.operateWindow.settingControl.dialogModelForChoseFixUserByTree) {
                user = this.$refs.choseFixUserCascader.getCheckedNodes()[0].data;
            } else {
                user = this.$refs.choseFixUserCascader1.getCheckedNodes()[0].data;
            }
            this.$emit('chosed-fix-user-changed', user);
        },
        noticePollingUserData() {
            const user = [];
            this.$refs.chosePollingUserCascader.getCheckedNodes().map(node => {
                if (!node.data.children) {
                    user.push(node.data);
                }
            });
            this.$emit('chosed-polling-user-changed', user);
        },
        searchConferenceMember(node, keyword) {
            if (this.searchKeyword) {
                const _arr = [];

                this.tileData.map(a => {
                    if (a.name.includes(this.searchKeyword)) {
                        _arr.push(a);
                    }
                });
                this.memberList = _arr;
            } else {
                this.memberList = this.tileData;
            }
        }
    }
}
</script>

<style scoped>
.cascader_search_input {
    height: 28px;
    line-height: 28px;
    width: 200px;
    float: right;
}
</style>
