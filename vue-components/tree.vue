<template>
    <div class="tree_contain">
        <!-- 树顶的单选多选和关键字搜索框 -->
        <div class="tree_header">
            <el-checkbox v-if="single" v-model="chose.single" size="mini" label="单选" />
            <el-checkbox v-if="multiple" v-model="chose.multiple" size="mini" label="多选" />
            <el-popover v-show="searchOption.length > 0" trigger="hover" placement="top" v-model="showSearchOption">
                <div class="search_option_contain">
                    <el-tag v-for="(text, i) in searchOption" :key="i" type="info" size="small">{{ text }}</el-tag>
                </div>
                <!-- icon="el-icon-refresh" -->
                <el-button type="primary" slot="reference" size="mini" class="plain_btn tree_header_refresh" title="点击重置" plain @click="resetChosed">重置</el-button>
            </el-popover>
            <input class="tree_header_input" type="text" v-model="keyword" placeholder="关键字搜索" />
            <div style="clear:both"></div>
        </div>

        <!-- 分割线 -->
        <el-divider class="tree_split"></el-divider>

        <!-- 树的内容 -->
        <div class="tree_body" :t="active">
            <el-collapse-transition v-for="(branch, i) in treeData" :key="i">
                <div v-if="branch.depth === 1 || branch.hide === false" class="tree_branch" :style="{ 'margin-left': `${(branch.depth - 1) * 20}px` }">
                    <div :class="['tree_branch_target', { click_branch: clickedBranchId === branch.id }]" @mouseover="hover = branch.id" @mouseleave="hover = ''">
                        <!-- 树枝的展开和收起按钮 -->
                        <i
                            v-if="branch.depth !== 1 && branch.hasChildren && branch.expand"
                            @click="toggleExpand(branch.id, false)"
                            class="el-icon-caret-right branch_extend_icon"
                        />
                        <i
                            v-if="branch.depth !== 1 && branch.hasChildren && !branch.expand"
                            @click="toggleExpand(branch.id, true)"
                            class="el-icon-caret-bottom branch_extend_icon"
                        />

                        <!-- 树枝的单选框 -->
                        <el-radio
                            v-if="chose.single"
                            v-model="singleChosed"
                            :label="branch.id"
                            :style="{ 'margin-left': branch.hasChildren && branch.depth !== 1 ? '0' : '5px' }"
                            :class="[{ include_keyword: keyword && branch.name.includes(keyword) }]"
                        >
                            {{ branch.name }}
                        </el-radio>

                        <!-- 树枝的多选框 -->
                        <el-checkbox
                            v-if="chose.multiple"
                            v-model="multipleChosed"
                            :label="branch.id"
                            :style="{ 'margin-left': branch.hasChildren && branch.depth !== 1 ? '0' : '5px' }"
                            :class="[{ include_keyword: keyword && branch.name.includes(keyword) }]"
                            @change="multipleChangeChosed"
                        >
                            {{ branch.name }}
                        </el-checkbox>

                        <!-- 树枝的节点名称，树枝的点击 -->
                        <span
                            v-if="!chose.multiple && !chose.single"
                            :class="['tree_text', { include_keyword: keyword && branch.name.includes(keyword) }]"
                            @click="clickBranch(branch.id)"
                        >
                            {{ branch.name }}
                        </span>

                        <!-- 是否允许树的操作 -->
                        <template v-if="(branch.hasChildren && chose.multiple) || operate">
                            <el-dropdown v-if="hover === branch.id || operateBranchId === branch.id" trigger="click" @command="operateTree" @visible-change="toggleOperate">
                                <i class="el-icon-link branch_operate_icon" @click="operateBranchId = branch.id" />
                                <el-dropdown-menu slot="dropdown">
                                    <el-dropdown-item v-if="branch.hasChildren && chose.multiple" :command="`${branch.id}:choseallbranch`">全选该部门</el-dropdown-item>
                                    <el-dropdown-item v-if="branch.hasChildren && chose.multiple" :command="`${branch.id}:notchoseallbranch`">取消全选</el-dropdown-item>
                                    <el-dropdown-item v-if="operate" :command="`${branch.id}:addchild`">添加子部门</el-dropdown-item>
                                    <el-dropdown-item v-if="operate && branch.id !== 'root'" :command="`${branch.id}:edit`">编辑</el-dropdown-item>
                                    <el-dropdown-item v-if="operate && branch.id !== 'root'" :command="`${branch.id}:delete`">删除</el-dropdown-item>
                                    <el-dropdown-item v-if="operate && branch.id !== 'root' && canMoveUp(branch.id, branch.parentId) === true" :command="`${branch.id}:up`">
                                        向上移动(同级)
                                    </el-dropdown-item>
                                    <el-dropdown-item v-if="operate && branch.id !== 'root' && canMoveDown(branch.id, branch.parentId) === true" :command="`${branch.id}:down`">
                                        向下移动(同级)
                                    </el-dropdown-item>
                                    <el-dropdown-item v-if="operate" :command="`${branch.id}:export`">导出</el-dropdown-item>
                                </el-dropdown-menu>
                            </el-dropdown>
                        </template>
                    </div>
                    <div style="clear:both"></div>
                </div>
            </el-collapse-transition>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        option: {
            type: Object,
            default: () => {
                return {
                    fullIdPathField: 'path',//哪个字段表示完整的层级路径
                    name: 'name'//哪个字段表示每个树枝上显示的内容
                }
            }
        },
        /**树的数据来源 */
        sourceData: {
            required: true,
            type: Array
        },
        /**树的名称 */
        treeName: {
            type: String,
            default: ''
        },
        /**是否支持单选 */
        single: {
            type: Boolean,
            default: false
        },
        /**组件初始单选开启时默认选中的值 */
        singleInitValue: {
            type: String,
            default: ''
        },
        /**是否支持多选 */
        multiple: {
            type: Boolean,
            default: false
        },
        /**组件初始多选开启时默认选中的值 */
        multipleInitValue: {
            type: Array,
            default: () => []
        },
        /**是否自动排序*/
        sort: {
            type: Boolean,
            default: false
        },
        /**哪个字段表示每层树枝上的排序顺序，该字段的值可通过parseInt处理之后比较大小 */
        sortBy: {
            type: String,
            default: 'sort'
        },
        /**排序字段的值由小到大表示降序还是升序，默认为"down"降序，其他值则认为是升序 */
        sortRule: {
            type: String,
            default: 'down'
        },
        /**是否开启树枝的删除，编辑，添加子级，导出，向上移动，向下移动，选中/不选中子部门操作 */
        operate: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            /**树的数据结构，每一项有以下属性
             * id: '4id',树枝的唯一标识
             * depth: 4,层级(深度)
             * path: '/1d/2d/3d/4d',完整路径
             * name: '第四层树枝',树枝显示的内容
             * parentId: '3id',父级树枝的唯一性标识
             * expand: true,是否被折叠
             * hide: true,是否隐藏
             * hasChildren: false,是否有子级
             * data: {} 传入的每个树枝的原始数据
             */
            treeData: [],
            treeTitle: this.treeName || this.$store.state.tenantSetting.tenantName,
            treeBranchIdMap: {},
            // 关键字搜索
            keyword: '',
            waitForKeywordInputEndTimer: null,
            // 单选/多选是否开启
            chose: {
                single: this.single && this.singleInitValue ? true : false,
                multiple: this.multiple && this.multipleInitValue.length > 0 ? true : false
            },
            // 单选开启时，单选选中的数据
            singleChosed: this.single && this.singleInitValue ? this.singleInitValue : '',
            multipleChosed: this.multiple && this.multipleInitValue,
            // 树的排序
            treeSort: {
                enabled: this.sort,
                by: this.sortBy,
                rule: this.sortRule === 'down' ? 'down' : 'up'
            },
            // 交互辅助数据
            hover: '',
            operateBranchId: '',
            clickedBranchId: '',
            showSearchOption: false,
            isInited: true,
            active: +new Date()
        }
    },
    computed: {
        searchOption() {
            const result = [];
            if (this.keyword) {
                result.push(`搜索关键字：${this.keyword}`);
            }
            if (this.clickedBranchId) {
                result.push(this.treeBranchIdMap[this.clickedBranchId].name);
            }

            if (this.chose.single && this.singleChosed && this.treeBranchIdMap[this.singleChosed]) {
                result.push(this.treeBranchIdMap[this.singleChosed].name);
            }
            if (this.chose.multiple && this.multipleChosed.length > 0) {
                this.treeData.filter(v => this.multipleChosed.includes(v.id)).map(a => {
                    result.push(a.name);
                });
            }
            return result;
        }
    },
    watch: {
        'chose.single'() {
            if (this.chose.single === true) {
                this.chose.multiple = false;
            }
            this.singleChosed = '';
            this.clickedBranchId = '';
        },
        'chose.multiple'() {
            if (this.chose.multiple === true) {
                this.chose.single = false;
            }
            this.multipleChosed = [];
            this.clickedBranchId = '';
        },
        clickedBranchId(newvalue, oldValue) {
            if (newvalue) {
                this.$emit('chosed-change', {
                    [this.clickedBranchId]: this.treeBranchIdMap[this.clickedBranchId].data
                });
            } else {//开启单选/多选时clickedBranchId被置为空
                this.$emit('chosed-change', {});
            }
        },
        singleChosed() {
            if (this.singleChosed) {//单选变动的时候
                this.$emit('chosed-change', {
                    [this.singleChosed]: this.treeBranchIdMap[this.singleChosed].data
                });
            } else {//取消单选的时候
                this.$emit('chosed-change', {});
            }
        },
        multipleChosed(newvalue, oldValue) {
            if (!(newvalue.length === 0 && oldValue.length === 0)) {
                const map = {};
                this.multipleChosed.map(a => {
                    map[a] = this.treeBranchIdMap[a].data;
                });
                this.$emit('chosed-change', map);
            }
        },
        sourceData() {
            this.treeData = this.generateTreeData();
            this.treeData.map(a => {
                this.treeBranchIdMap[a.id] = a;
            });
        },
        keyword() {
            const waitTime = 600;
            if (this.waitForKeywordInputEndTimer === null) {
                this.waitForKeywordInputEndTimer = setTimeout(() => {
                    this.searchTreeByKeyword();
                }, waitTime);
            } else {
                clearTimeout(this.waitForKeywordInputEndTimer);
                this.waitForKeywordInputEndTimer = setTimeout(() => {
                    this.searchTreeByKeyword();
                }, waitTime);
            }
        }
    },
    methods: {
        /**根据每个树枝的原始数据生成标准树枝的数据 */
        getBranchFormatData(_branch) {
            const pathSplit = _branch[this.option.fullIdPathField].split('/');
            const id = pathSplit[pathSplit.length - 1];
            const parentId = pathSplit[pathSplit.length - 2] || 'root';
            const path = `root/${pathSplit.filter(a => !!a).join('/')}`;
            return {
                id,
                parentId,
                name: _branch[this.option.name],
                path,
                depth: path.split('/').length,
                sort: this.treeSort.enabled && _branch[this.treeSort.by] && parseInt(_branch[this.treeSort.by]) ? parseInt(_branch[this.treeSort.by]) : 1
            }
        },
        /**根据原始的树的数据生成符合条件的树数据 */
        generateTreeFormatData() {
            const sourceData = [...this.sourceData];
            const keyword = this.keyword;
            // 辅助生成树结构的数据
            let minDepth = null;

            // 生成标准的树数据结构
            let _formatData = [];

            const allBranchId = new Set();
            let matchKeywordIds = new Set();
            if (keyword) {
                sourceData.map(branch => {
                    const { id, name } = this.getBranchFormatData(branch);
                    if (name.includes(keyword)) {
                        matchKeywordIds.add(id)
                    }
                });
                let matchKeywordChildrenIds = new Set();
                for (const id of matchKeywordIds) {
                    const matchKeywordChildren = sourceData.filter(v => {
                        const { path } = this.getBranchFormatData(v);
                        return path.includes(id)
                    })

                    matchKeywordChildrenIds = new Set([...matchKeywordChildrenIds, ...matchKeywordChildren.map(branch => this.getBranchFormatData(branch).id)]);
                }
                matchKeywordIds = new Set([...matchKeywordIds, ...matchKeywordChildrenIds]);
            }
            sourceData.map(branch => {
                const { id, parentId, path, depth, sort, name } = this.getBranchFormatData(branch);
                if (path && id && parentId && name && !allBranchId.has(id)) {
                    if (!keyword || matchKeywordIds.has(id)) {
                        const _obj = {
                            id,
                            depth,
                            path,
                            name,
                            parentId,
                            expand: true,
                            hide: true,
                            hasChildren: false,
                            sort,
                            data: branch
                        }

                        if (minDepth === null) {
                            minDepth = _obj.depth;
                        }
                        if (_obj.depth < minDepth) {
                            minDepth = _obj.depth;
                        }

                        _formatData.push(_obj);
                        allBranchId.add(id);
                    }
                }
            });
            const rootChildren = [];
            const formatData = [];
            _formatData.map(branch => {
                if (!allBranchId.has(branch.parentId)) {
                    rootChildren.push(branch);
                } else {
                    formatData.push(branch);
                }
            });

            // 将一级树的depth设为2
            rootChildren.map(a => {
                a.depth = 2;
                a.hide = false;
                a.parentId = 'root';
            });

            return {
                root: {
                    id: 'root',
                    depth: 1,
                    path: 'root',
                    name: this.treeTitle,
                    parentId: '',
                    expand: false,
                    hide: false,
                    hasChildren: true,
                    data: {}
                },
                rootChildren,
                formatData
            }
        },
        /**生成经过排序字段排序的树 */
        generateTreeSortData() {
            const { root, rootChildren, formatData } = this.generateTreeFormatData();
            /**最后组装数据使用 */
            const branchMap = {
                root
            };
            /**每个树枝的id和其所在的树的层级的map */
            const map1 = {};
            rootChildren.map(a => {
                branchMap[a.id] = a;
                map1[a.id] = 2;
            });
            /**树的层级和该层级下树枝与其父级id的map */
            const map2 = {
                level2: {
                    root: rootChildren
                }
            }
            let loopData = [...formatData];
            const loopFn = () => {
                const rest = [];
                loopData.map(branch => {
                    if (map1[branch.parentId]) {
                        map1[branch.id] = map1[branch.parentId] + 1;
                        if (!map2[`level${map1[branch.id]}`]) {
                            map2[`level${map1[branch.id]}`] = {};
                        }
                        if (!map2[`level${map1[branch.id]}`][branch.parentId]) {
                            map2[`level${map1[branch.id]}`][branch.parentId] = [];
                        }
                        branch.depth = map1[branch.id];
                        map2[`level${map1[branch.id]}`][branch.parentId].push(branch);
                        branchMap[branch.id] = branch;
                    } else {
                        rest.push(branch);
                    }
                });
                if (rest.length > 0) {
                    loopData = rest;
                    loopFn();
                }
            }
            loopFn();

            // 每个有子级的树枝子级排序
            let belongMap = {};
            let maxLevel = 2;
            for (const key in map2) {
                const _level = parseInt(key.replace('level', ''));
                if (_level > maxLevel) {
                    maxLevel = _level;
                }
                belongMap = { ...belongMap, ...map2[key] }
            }

            for (const key in belongMap) {
                belongMap[key] = this.treeSort.rule === 'down' ? belongMap[key].sort((a, b) => a.sort - b.sort) : belongMap[key].sort((a, b) => b.sort - a.sort)
            }

            // 开始组装数据
            const result = [root];
            for (let s = 2; s <= maxLevel; s++) {
                const parents = Object.keys(map2[`level${s}`]);
                for (let a = 0; a < parents.length; a++) {
                    const _index = result.findIndex(v => v.id === parents[a]);
                    result[_index].hasChildren = true;
                    result.splice(_index + 1, 0, ...belongMap[parents[a]]);
                }
            }

            return result;
        },
        /**生成?没有经过排序字段排序的树 */
        generateTreeWithoutSortData() {
            const initTreeData = this.generateTreeFormatData();

            /* 开始拼装树的数据 */
            let result = [];
            // 寻找一级树(两种情况：深度最小的树枝，其path不包含其他所有树枝数据的path的树枝，这两种情况即allBranchId没有其parentId的情况)
            const rootBranch = initTreeData.root;
            const secondLevelBranch = initTreeData.rootChildren;
            let formatData = initTreeData.formatData;
            result = [rootBranch, ...secondLevelBranch];

            // 处理所有能通过parentId找到父级的树枝(有些树的中间层级原始数据是断的)
            const dealWithParentId = () => {
                const _rest = [];
                let hasAlone = true;
                for (let s = 0; s < formatData.length; s++) {
                    const _index = result.findIndex(b => b.id === formatData[s].parentId);
                    if (_index > -1) {
                        result[_index].hasChildren = true;
                        formatData[s].depth = result[_index].depth + 1;

                        result.splice(_index + 1, 0, formatData[s]);
                        hasAlone = false;
                    } else {
                        _rest.push(formatData[s]);
                    }
                }
                formatData = _rest;
                if (hasAlone === false) {
                    dealWithParentId();
                }
            }
            dealWithParentId();

            return result;
        },
        /**最终生成树图 */
        generateTreeData() {
            let result = [];
            if (this.treeSort.enabled) {
                result = this.generateTreeSortData();
            } else {
                result = this.generateTreeWithoutSortData();
            }

            if (this.isInited === true) {//如果是初始化，展开单选/多选赋的初始值
                let shouldUnfoldIds = new Set();
                if (this.chose.single && this.singleChosed) {
                    shouldUnfoldIds.add(this.singleChosed);
                }
                if (this.chose.multiple && this.multipleChosed.length > 0) {
                    shouldUnfoldIds = new Set([...shouldUnfoldIds, ...this.multipleChosed])
                }
                let shouldUnfoldBranchIds = new Set();
                result.filter(v => shouldUnfoldIds.has(v.id)).map(a => {
                    shouldUnfoldBranchIds = new Set([...shouldUnfoldBranchIds, ...a.path.split('/')])
                })
                for (let s = 0; s < result.length; s++) {
                    if (shouldUnfoldBranchIds.has(result[s].id)) {
                        result[s].expand = false;
                        result[s].hide = false;
                    }
                    if (shouldUnfoldBranchIds.has(result[s].parentId)) {
                        result[s].hide = false;
                    }
                }
                this.isInited = false;
            }
            return result;
        },
        /**树的展开和收起 */
        toggleExpand(branchId, isHide) {
            // isHide =true意为收起
            let temp = [...this.treeData];
            const arr = [];
            for (let s = 0; s < temp.length; s++) {
                if (temp[s].id !== branchId && temp[s].path.includes(branchId)) {
                    if (isHide === true) {
                        temp[s].hide = true;
                        temp[s].expand = true;
                    } else {
                        if (temp[s].parentId === branchId) {
                            temp[s].hide = false;
                        }
                    }
                }
                if (temp[s].id === branchId) {
                    temp[s].expand = isHide;
                }
                arr.push(temp[s]);
            }
            this.treeData = arr;
            this.active = +new Date()
        },
        /**判断树枝是否可以向上移动 */
        canMoveUp(branchId, branchPid) {
            const _index = [...this.treeData].findIndex(v => v.id === branchId);
            const aheadBranch = [...this.treeData].filter((value, i) => i < _index);
            return aheadBranch.filter(v => v.parentId === branchPid).length > 0;
        },
        /**判断树枝是否可以向下移动 */
        canMoveDown(branchId, branchPid) {
            const _index = [...this.treeData].findIndex(v => v.id === branchId);
            const afterBranch = [...this.treeData].filter((value, i) => i > _index);
            return afterBranch.filter(v => v.parentId === branchPid).length > 0;
        },
        toggleOperate(isShow) {
            if (!isShow) {
                this.operateBranchId = '';
            }
        },
        clickBranch(_branchId) {
            this.clickedBranchId = _branchId;
        },
        /**重置树的选中及搜索状态 */
        resetChosed() {
            this.showSearchOption = false;
            this.keyword = '';
            this.clickedBranchId = '';
            if (this.single) {
                this.chose.single = false;
                this.singleChosed = '';
            }
            if (this.multiple) {
                this.chose.multiple = false;
                this.multipleChosed = [];
            }
        },
        /**树的多选 */
        multipleChangeChosed(isChosed, event) {
            const id = event.target.value;
            if (isChosed === true) {//如果选中，则选中的值时model数据的最后一个元素
                // 查看与这个id有相同父元素的是否已经全部选中，若全部选中，则其父元素也应选中
                // const parentId = this.treeBranchIdMap[id].parentId;
                // const childrenIds = this.treeData.filter(v => v.parentId === parentId).map(a => a.id);
                // let shouldChoseParent = true;
                // for (let s = 0; s < childrenIds.length; s++) {
                //     if (!this.multipleChosed.includes(childrenIds[s]) && childrenIds[s] !== id) {
                //         shouldChoseParent = false;
                //     }
                // }
                // // 对应的子级元素也应该都选中
                // const shouldChose = this.treeData.filter(v => v.path.includes(id) || (shouldChoseParent === true && v.id === parentId));
                // const _set = new Set([...this.multipleChosed, ...shouldChose.map(a => a.id)]);
                // this.multipleChosed = [..._set];
                this.multipleChosed = [...new Set([...this.multipleChosed, id])];
            } else {
                // 父级元素也不应该被选中
                // 寻找所有父元素
                // const parentIds = this.treeBranchIdMap[id].path.split('/');
                // const shouldNotChose = this.treeData.filter(v => v.path.includes(id) || parentIds.includes(v.id));
                // const _set = new Set([...this.multipleChosed]);
                // shouldNotChose.map(a => {
                //     _set.delete(a.id);
                // })
                // this.multipleChosed = [..._set];
                const _set = new Set([...this.multipleChosed]);
                _set.delete(id);
                this.multipleChosed = [..._set];
            }
        },
        /**树的多选 */
        multipleChoseAllChildren(branchId) {
            const tree = [...this.treeData];
            const shouldChoseIds = tree.filter(v => v.path.includes(branchId)).map(a => a.id);
            this.multipleChosed = [...new Set([...this.multipleChosed, ...shouldChoseIds])];
        },
        /**取消多选 */
        multipleNotChoseAllChildren(branchId) {
            const tree = [...this.treeData];
            const _set = new Set([...this.multipleChosed]);
            tree.filter(v => v.path.includes(branchId)).map(a => {
                _set.delete(a.id);
            });
            this.multipleChosed = [..._set];
        },
        /**树的操作 */
        operateTree(_command) {
            const [id, operate] = _command.split(':');
            this.operateBranchId = '';
            if (operate === 'addchild') {
                this.addChildBranch(this.treeBranchIdMap[id].data);
            } else if (operate === 'edit') {
                this.renameBranch(this.treeBranchIdMap[id].data);
            } else if (operate === 'delete') {
                this.deleteBranch(this.treeBranchIdMap[id].data);
            } else if (operate === 'export') {
                this.exportBranch(this.treeBranchIdMap[id].data);
            } else if (operate === 'choseallbranch') {
                this.multipleChoseAllChildren(id);
            } else if (operate === 'notchoseallbranch') {
                this.multipleNotChoseAllChildren(id);
            } else if (operate === 'up') {
                this.setPosition(this.treeBranchIdMap[id].data, operate);
            } else if (operate === 'down') {
                this.setPosition(this.treeBranchIdMap[id].data, operate);
            }
        },
        setPosition(_branchData, action) {
            const currentId = this.getBranchFormatData(_branchData).id;
            const tree = [...this.treeData];
            const shouldMoveData = tree.filter(v => v.path.includes(currentId));
            const currentIndex = tree.findIndex(v => v.id === currentId);
            let nextSameLevelId = null;
            let preSameLevelId = null;
            if (action === 'down') {
                nextSameLevelId = tree[currentIndex + shouldMoveData.length].id;
            } else {
                let _inx = null;
                tree.map((a, i) => {
                    if (a.parentId === tree[currentIndex].parentId && i < currentIndex) {
                        _inx = i;
                    }
                })
                preSameLevelId = tree[_inx].id;
            }
            const self = this;
            const setLocationSuccess = () => {
                if (action === 'down') {
                    tree.splice(currentIndex, shouldMoveData.length);
                    let _index = null;
                    tree.map((a, i) => {
                        if (a.path.includes(nextSameLevelId)) {
                            _index = i;
                        }
                    })
                    tree.splice(_index + 1, 0, ...shouldMoveData);
                } else {
                    const preSameLevelIndex = tree.findIndex(v => v.id === preSameLevelId);
                    tree.splice(currentIndex, shouldMoveData.length);
                    tree.splice(preSameLevelIndex, 0, ...shouldMoveData);
                }
                self.treeData = tree;
            }
            if (action === 'down') {
                this.$emit('down-branch', _branchData, this.treeBranchIdMap[nextSameLevelId].data, setLocationSuccess);
            } else {
                this.$emit('up-branch', _branchData, this.treeBranchIdMap[preSameLevelId].data, setLocationSuccess);
            }
        },
        addChildBranch(_addedBranchData) {
            const self = this;
            const addSuccess = newBranchData => {
                const newData = self.getBranchFormatData(newBranchData);
                if (Object.keys(_addedBranchData).length === 0) {//树根
                    self.treeData.push({
                        id: newData.id,
                        depth: 2,
                        path: newData.path,
                        name: newData.name,
                        parentId: 'root',
                        expand: true,
                        hide: false,
                        hasChildren: false,
                        data: newBranchData
                    });
                } else {
                    const addData = self.getBranchFormatData(_addedBranchData);
                    const tree = self.treeData.map(a => a);
                    let _index = tree.findIndex(v => v.id === addData.id);
                    tree[_index].hasChildren = true;
                    tree[_index].expand = false;
                    tree.splice(_index + 1, 0, {
                        id: newData.id,
                        depth: self.treeBranchIdMap[addData.id].depth + 1,
                        path: `${self.treeBranchIdMap[addData.id].path}/${newData.id}`,
                        name: newData.name,
                        parentId: addData.id,
                        expand: true,
                        hide: false,
                        hasChildren: false,
                        data: newBranchData
                    });
                    self.treeData = tree;
                }
            }
            this.$emit('add-child', _addedBranchData, addSuccess);
        },
        renameBranch(_branchData) {
            const self = this;
            const renameSuccess = newBranchData => {
                const { id, name } = self.getBranchFormatData(newBranchData);
                for (let s = 0; s < self.treeData.length; s++) {
                    if (self.treeData[s].id === id) {
                        self.treeData[s].name = name;
                        break;
                    }
                }
            }
            this.$emit('rename-branch', _branchData, renameSuccess);
        },
        deleteBranch(_branchData) {
            const self = this;
            const deleteSuccess = () => {
                let tree = [...self.treeData];
                const { parentId, id } = self.getBranchFormatData(_branchData);
                const childrenNum = tree.filter(v => v.parentId === parentId).length;
                tree = tree.filter(v => !v.path.includes(id));
                if (childrenNum === 1) {
                    for (let s = 0; s < tree.length; s++) {
                        if (tree[s].id === parentId) {
                            tree[s].hasChildren = false;
                            break;
                        }
                    }
                }
                self.treeData = tree;
            }
            this.$emit('delete-branch', _branchData, deleteSuccess);
        },
        exportBranch(_branchData) {
            this.$emit('export-branch', _branchData);
        },
        searchTreeByKeyword() {
            this.treeData = this.generateTreeData();
        }
    }
}
</script>

<style scoped>
.tree_contain {
    border-radius: 8px;
    background-color: #fff;
    width: 360px;
    overflow: hidden;
}
.tree_header {
    padding: 10px 10px 8px;
    background-color: #fff;
    width: 340px;
    border-radius: 8px;
    border-bottom-right-radius: 0;
}
.tree_header .el-checkbox {
    margin-top: 3px;
    margin-right: 10px;
    float: left;
}

.tree_header_input {
    width: 135px;
    padding: 0 9px;
    line-height: 24px;
    height: 24px;
    float: right;
    background-color: #fff;
    background-image: none;
    border-radius: 6px;
    border: 1px solid #dcdfe6;
    color: #606266;
    font-size: inherit;
    outline: none;
    transition: border-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
}
.tree_header_input:focus {
    outline: none;
    border-color: #409eff;
}
.tree_header_refresh {
    padding: 3px 7px;
    font-size: 12px;
    float: left;
    margin-top: 3px;
}
.search_option_contain {
    max-width: 400px;
    margin-top: -13px;
    margin-left: -13px;
}

.tree_split {
    margin: 2px 10px 10px;
    width: calc(100% - 20px);
    background-color: #eff1f7;
}
.tree_body {
    max-height: 610px;
    overflow: auto;
    margin: 0 10px;
    border-radius: 8px;
    padding-bottom: 10px;
}
.tree_branch {
    line-height: 24px;
    height: 32px;
    white-space: nowrap;
    border-radius: 8px;
}
.tree_path_horizontal {
    display: block;
    position: relative;
    top: 18px;
    float: left;
    margin-left: -18px;
    width: 18px;
    height: 0;
    border-bottom: 1px solid #dcdfe6;
}
.tree_path_vertical {
    display: block;
    position: relative;
    bottom: 5px;
    float: left;
    margin-left: -19px;
    width: 0;
    height: 20px;
    border-left: 1px solid #dcdfe6;
}
.tree_branch_target {
    /* background-color: rgba(0, 0, 0, 0.05); */
    padding-right: 10px;
    padding-left: 4px;
    /* border: 1px solid #dcdfe6; */
    border-radius: 4px;
    float: left;
    margin: 3px 0;
    transition: all 0.3s;
    cursor: pointer;
    color: #606266;
}
.tree_branch_target .el-radio {
    margin-right: 0;
}
.tree_branch_target:hover,
.click_branch {
    background-color: #ecf5ff;
    color: #409eff;
    border-color: #b3d8ff;
}
.tree_text {
    white-space: nowrap;
    padding-left: 5px;
    font-size: 13px;
}
.include_keyword {
    /* color: #f56c6c; */
    color: #606266;
}

.branch_extend_icon,
.branch_operate_icon {
    font-weight: 600;
    font-size: 14px;
    line-height: 24px;
    padding-left: 5px;
    cursor: pointer;
}
.branch_operate_icon {
    color: #409eff;
}
.branch_extend_icon {
    font-size: 12px;
}
.branch_extend_icon:hover,
.branch_operate_icon:hover {
    color: #606266;
}
::-webkit-scrollbar {
    width: 3px;
    height: 3px;
    scrollbar-arrow-color: red;
}

::-webkit-scrollbar-thumb {
    border-radius: 5px;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
    background: rgba(0, 0, 0, 0.15);
    scrollbar-arrow-color: red;
}

::-webkit-scrollbar-track {
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0);
    border-radius: 0;
    background: rgba(0, 0, 0, 0.05);
}
</style>
