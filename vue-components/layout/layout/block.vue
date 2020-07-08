<template>
    <div
        :class="[
            'layout_block',
            {
                layout_block_active: block.type === 'ACTIVE_SPEAKER' || (block.displayList.length > 0 && (block.type === 'FIX' || block.type === 'LOOP'))
            }
        ]"
    >
        <div class="layout_block_order">{{ "No." + block.windows.location.order }}</div>
        <el-dropdown trigger="click" @command="noticeBlockLayoutTypeChange">
            <span class="layout_dropdown_link" :contents="block.type">
                {{ block.type === "AUTO" ? "自动" : block.type === "ACTIVE_SPEAKER" ? "发言者" : block.type === "LOOP" ? "队列轮询" : block.type === "FIX" ? "固定" : "内容选择" }}
                <i class="el-icon-arrow-down el-icon--right"></i>
            </span>
            <el-dropdown-menu slot="dropdown">
                <el-dropdown-item :command="`AUTO:${block.windows.windowId}`">自动</el-dropdown-item>
                <el-dropdown-item :command="`ACTIVE_SPEAKER:${block.windows.windowId}`" v-if="hasSpeaker === false">发言者</el-dropdown-item>
                <el-dropdown-item :command="`FIX:${block.windows.windowId}`" v-if="isCustomize"> 固定 </el-dropdown-item>
                <el-dropdown-item :command="`LOOP:${block.windows.windowId}`" v-if="isCustomize">队列轮询</el-dropdown-item>
            </el-dropdown-menu>
        </el-dropdown>
        <p class="tac">
            <span class="layout_display_user" v-if="block.type === 'FIX'" @click="noticeToChoseFixUser">
                {{ !block.displayArray[0] ? "请选择" : block.displayArray[0].name ? block.displayArray[0].name : "请选择" }}
            </span>
            <span
                class="layout_display_user"
                :title="block.displayArray.length > 0 ? `[${translatePollingTime(block.loopInterval)}]${block.displayArray.map(i => i.name).join('/')}` : '请选择'"
                v-if="block.type === 'LOOP'"
                @click="noticeToChosePollingUser"
            >
                {{ block.displayArray.length > 0 ? `[${translatePollingTime(block.loopInterval)}]${block.displayArray.map(i => i.name).join("/")}` : "请选择" }}
            </span>

            <!-- <span class="layout_unclick_user" v-if="block.type === 'AUTO'">[自动]</span> -->
            <span class="layout_unclick_user" v-if="block.type === 'ACTIVE_SPEAKER'">[发言者]</span>
        </p>
    </div>
</template>

<script>
export default {
    props: {
        block: {
            required: true,
            type: Object
        },
        isCustomize: {
            required: true,
            type: Boolean
        },
        hasSpeaker: {
            required: true,
            type: Boolean
        }
    },
    data() {
        return {

        }
    },
    watch: {

    },
    computed: {

    },
    methods: {
        noticeBlockLayoutTypeChange(displayType) {
            this.$emit('display-type-changed', displayType);
        },
        noticeToChoseFixUser() {
            this.$emit('before-show-chose-fix-user-dialog', this.block);
        },
        noticeToChosePollingUser() {
            this.$emit('before-show-chose-polling-user-dialog', this.block);
        },
        translatePollingTime(time) {
            let result = '';
            if (time === '15000') {
                result = '15秒';
            } else if (time === '60000') {
                result = '60秒';
            } else if (time === '180000') {
                result = '3分钟';
            } else if (time === '300000') {
                result = '5分钟';
            }

            return result;
        }
    }
}
</script>

<style scoped>
.layout_display_user {
    font-size: 16px;
    font-weight: 600;
    border-bottom: 1px solid #fff;
    cursor: pointer;
    text-decoration: underline;
}
.layout_unclick_user {
    font-size: 20px;
    color: #fff;
}
.tac {
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 20px;
    color: #fff;
}
</style>
