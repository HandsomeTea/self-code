<template>
    <el-main :class="layoutContentClass">
        <layout-block
            :class="layoutClass"
            v-for="(block, i) in windowInfo.list"
            :key="i"
            :block="block"
            :is-customize="isCustomize"
            :has-speaker="windowInfo.hasActiveSpeaker"
            @display-type-changed="changeBlockDisplayType"
            @before-show-chose-fix-user-dialog="prepareForChoseFixUser"
            @before-show-chose-polling-user-dialog="prepareForChosePollingUser"
        ></layout-block>

        <chose-dialog
            :operate-window="operateWindow"
            :tree-data="conferenceMemberTree"
            :tile-data="conferenceMemberTile"
            @chosed-fix-user-changed="setFixUser"
            @chosed-polling-user-changed="setPollingUser"
        ></chose-dialog>
    </el-main>
</template>
<script>
import layoutVue from './layout.js';
export default layoutVue;
</script>
