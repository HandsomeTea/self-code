<template>
    <div class="tree_contain">
        <!-- 树顶的单选多选和关键字搜索框 -->
        <div class="tree_header">
            <input class="tree_header_input" type="text" v-model="keyword" placeholder="关键字搜索" />
            <el-popover v-show="searchOption.length > 0" trigger="hover" placement="top" v-model="showSearchOption">
                <div class="search_option_contain">
                    <el-tag v-for="(text, i) in searchOption" :key="i" type="info" size="small">{{ text }}</el-tag>
                </div>
                <el-button type="primary" slot="reference" icon="el-icon-refresh" size="mini" class="plain_btn tree_header_refresh" title="点击重置" plain @click="resetChosed" />
            </el-popover>
            <el-checkbox v-if="option.single" v-model="chose.single" size="mini" label="单选" />
            <el-checkbox v-if="option.multiple" v-model="chose.multiple" size="mini" label="多选" />
            <div style="clear:both"></div>
        </div>

        <!-- 分割线 -->
        <el-divider class="tree_split"></el-divider>

        <!-- 树的内容 -->
        <div class="tree_body" :t="active">
            <el-collapse-transition v-for="(branch, i) in treeData" :key="i">
                <div v-if="branch.depth === 1 || branch.hide === false" class="tree_branch" :style="{ 'margin-left': `${(branch.depth - 1) * 30}px` }">
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
                        <template v-if="chose.multiple || option.operate">
                            <el-dropdown v-if="hover === branch.id || operateBranchId === branch.id" trigger="click" @command="operateTree" @visible-change="toggleOperate">
                                <i class="el-icon-link branch_operate_icon" @click="operateBranchId = branch.id" />
                                <el-dropdown-menu slot="dropdown">
                                    <el-dropdown-item v-if="chose.multiple" :command="`${branch.id}:choseallchildren`">选中所有子部门</el-dropdown-item>
                                    <el-dropdown-item v-if="chose.multiple" :command="`${branch.id}:notchoseallchildren`">不选所有子部门</el-dropdown-item>
                                    <el-dropdown-item v-if="option.operate" :command="`${branch.id}:addchild`">添加子部门</el-dropdown-item>
                                    <el-dropdown-item v-if="option.operate && branch.id !== 'root'" :command="`${branch.id}:edit`">重命名</el-dropdown-item>
                                    <el-dropdown-item v-if="option.operate && branch.id !== 'root'" :command="`${branch.id}:delete`">删除</el-dropdown-item>
                                    <el-dropdown-item v-if="option.operate" :command="`${branch.id}:export`">导出</el-dropdown-item>
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
            default: {
                fullIdPathField: 'path',//哪个字段表示完整的层级路径
                id: 'id',//哪个字段表示每个树枝的唯一性标识
                pid: 'pid',//哪个字段表示每个树枝父级树枝的唯一性标识
                name: 'name',//哪个字段表示每个树枝上显示的内容
                single: false,//是否支持单选
                singleInitChose: false,//组件初始单选是否默认开启
                singleInitChosedId: '',//组件初始单选开启时默认选中的值
                multiple: false,//是否支持多选
                multipleInitChose: false,//组件初始多选是否默认开启
                multipleInitChosedIds: [],//组件初始多选开启时默认选中的值
                operate: false,//是否开启树枝的删除，编辑，添加子级，导出操作
            }
        },
        sourceData: {//树的数据来源
            required: true,
            type: Array
        },
        treeName: {//树的名称
            type: String,
            default: ''
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
            keyword: '',
            waitForKeywordInputEndTimer: null,
            chose: {
                single: this.option.single ? this.option.singleInitChose : false,
                multiple: this.option.multiple ? this.option.multipleInitChose : false
            },
            singleChosed: this.option.single && this.option.singleInitChose ? this.option.singleInitChosedId : '',
            multipleChosed: this.option.multiple && this.option.multipleInitChose ? this.option.multipleInitChosedIds : [],
            // 交互辅助数据
            hover: '',
            operateBranchId: '',
            clickedBranchId: '',
            showSearchOption: false,
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
            if (this.chose.single && this.singleChosed) {
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
            this.treeData = this.generateTreeData(this.sourceData);
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
        generateTreeData(sourceData = [], keyword = '') {
            // 辅助生成树结构的数据
            let minDepth = null;

            // 生成标准的树数据结构
            let formatData = [];

            const allBranchId = new Set();
            const matchKeywordIds = new Set();
            if (keyword) {
                sourceData.map(branch => {
                    if (branch[this.option.name].includes(keyword)) {
                        matchKeywordIds.add(branch[this.option.id])
                    }
                    for (const id of matchKeywordIds) {
                        if (branch[this.option.fullIdPathField].includes(id)) {
                            matchKeywordIds.add(branch[this.option.id]);
                            break;
                        }
                    }
                });
            }
            sourceData.map(branch => {
                if (branch[this.option.fullIdPathField] && branch[this.option.id] && branch[this.option.pid] && branch[this.option.name] && !allBranchId.has(branch[this.option.id])) {
                    if (!keyword || matchKeywordIds.has(branch[this.option.id])) {
                        const pathArr = branch[this.option.fullIdPathField].split('/').filter(iteam => !!iteam);
                        const _obj = {
                            id: branch[this.option.id],
                            depth: pathArr.length + 1,
                            path: `root/${pathArr.join('/')}`,
                            name: branch[this.option.name],
                            parentId: branch[this.option.pid].replace('/', ''),
                            expand: true,
                            hide: true,
                            hasChildren: false,
                            data: branch
                        }

                        if (minDepth === null) {
                            minDepth = _obj.depth;
                        }
                        if (_obj.depth < minDepth) {
                            minDepth = _obj.depth;
                        }

                        formatData.push(_obj);
                        allBranchId.add(branch[this.option.id]);
                    }
                }
            });

            /** condition和stringInclude只能二传一，优先以condition为准 */
            const _pick = (objArray = [], condition = {}, stringInclude = {}) => {
                if (objArray.length === 0) {
                    return null;
                }
                if (Object.keys(condition).length === 0 && Object.keys(stringInclude).length === 0) {
                    return objArray;
                }
                const matched = [];
                const rest = [];
                for (let s = 0; s < objArray.length; s++) {
                    let isMatched = true;
                    if (Object.keys(condition).length > 0) {
                        for (const key in condition) {
                            if (objArray[s][key] !== condition[key]) {
                                isMatched = false;
                                break;
                            }
                        }
                    } else if (Object.keys(stringInclude).length > 0) {
                        for (const key in stringInclude) {
                            if (!stringInclude[key].includes(objArray[s][key])) {
                                isMatched = false;
                                break;
                            }
                        }
                    }

                    if (isMatched === true) {
                        matched.push(objArray[s]);
                    } else {
                        rest.push(objArray[s]);
                    }
                }

                return {
                    matched,
                    rest
                };
            }

            /* 开始拼装树的数据 */
            let result = [];
            // 寻找一级树(两种情况：深度最小的树枝，其path不包含其他所有树枝数据的path的树枝，这两种情况即allBranchId没有其parentId的情况)
            const aloneRootTree = formatData.filter(value => !allBranchId.has(value.parentId));
            const picked = _pick(formatData, {}, { id: aloneRootTree.map(a => a.id).join('') });
            result = [...result, ...picked && picked.matched || []];
            formatData = picked && picked.rest || [];

            // 将一级树的depth设为2
            result.map(a => {
                a.depth = 2;
                a.hide = false;
                a.parentId = 'root';
            });

            // 添加树根
            result = [{
                id: 'root',
                depth: 1,
                path: 'root',
                name: this.treeTitle,
                parentId: '',
                expand: false,
                hide: false,
                hasChildren: true,
                data: {}
            }, ...result];

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
        toggleOperate(isShow) {
            if (!isShow) {
                this.operateBranchId = '';
            }
        },
        clickBranch(_branchId) {
            this.clickedBranchId = _branchId;
        },
        resetChosed() {
            this.showSearchOption = false;
            this.keyword = '';
            this.clickedBranchId = '';
            if (this.option.single) {
                this.chose.single = false;
                this.singleChosed = '';
            }
            if (this.option.multiple) {
                this.chose.multiple = false;
                this.multipleChosed = [];
            }
        },
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
        multipleChoseAllChildren(branchId) {
            const tree = [...this.treeData];
            const shouldChoseIds = tree.filter(v => v.path.includes(branchId) && v.id !== branchId).map(a => a.id);
            this.multipleChosed = [...new Set([...this.multipleChosed, ...shouldChoseIds])];
        },
        multipleNotChoseAllChildren(branchId) {
            const tree = [...this.treeData];
            const _set = new Set([...this.multipleChosed]);
            tree.filter(v => v.path.includes(branchId) && v.id !== branchId).map(a => {
                _set.delete(a.id);
            });
            this.multipleChosed = [..._set];
        },
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
            } else if (operate === 'choseallchildren') {
                this.multipleChoseAllChildren(id);
            } else if (operate === 'notchoseallchildren') {
                this.multipleNotChoseAllChildren(id);
            }
        },
        addChildBranch(_addedBranchData) {
            const self = this;
            const addSuccess = newBranchData => {
                if (Object.keys(_addedBranchData).length === 0) {//树根
                    self.treeData.push({
                        id: newBranchData[self.option.id],
                        depth: 2,
                        path: `root/${newBranchData[self.option.fullIdPathField].split('/').filter(iteam => !!iteam).join('/')}`,
                        name: newBranchData[self.option.name],
                        parentId: 'root',
                        expand: true,
                        hide: false,
                        hasChildren: false,
                        data: newBranchData
                    });
                } else {
                    const tree = self.treeData.map(a => a);
                    const childrenNum = tree.filter(v => v.parentId === _addedBranchData[self.option.id]).length;
                    let _index = tree.findIndex(v => v.id === _addedBranchData[self.option.id]);
                    tree[_index].hasChildren = true;
                    tree[_index].expand = false;
                    if (childrenNum > 0) {
                        tree.map((b, i) => {
                            if (b.parentId === _addedBranchData[self.option.id]) {
                                b.hide = false;
                                _index = i;
                            }
                        });
                    }
                    tree.splice(_index + 1, 0, {
                        id: newBranchData[self.option.id],
                        depth: self.treeBranchIdMap[_addedBranchData[self.option.id]].depth + 1,
                        path: `${self.treeBranchIdMap[_addedBranchData[self.option.id]].path}/${newBranchData[self.option.id]}`,
                        name: newBranchData[self.option.name],
                        parentId: _addedBranchData[self.option.id],
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
                for (let s = 0; s < self.treeData.length; s++) {
                    if (self.treeData[s].id === newBranchData[self.option.id]) {
                        self.treeData[s].name = newBranchData[self.option.name];
                        break;
                    }
                }
            }
            this.$emit('rename-branch', _branchData, renameSuccess);
        },
        deleteBranch(_branchData) {
            const self = this;
            const deleteSuccess = () => {
                let tree = self.treeData.map(a => a);;
                const childrenNum = tree.filter(v => v.parentId === _branchData[self.option.pid]).length;
                tree = tree.filter(v => !v.path.includes(_branchData[self.option.id]));
                if (childrenNum === 1) {
                    for (let s = 0; s < tree.length; s++) {
                        if (tree[s].id === _branchData[self.option.pid]) {
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
            this.treeData = this.generateTreeData(this.sourceData, this.keyword);
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
    float: right;
}

.tree_header_input {
    width: 135px;
    padding: 0 9px;
    line-height: 24px;
    height: 24px;
    float: left;
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
    padding: 4px 10px;
    font-size: 14px;
    float: right;
}
.search_option_contain {
    max-width: 400px;
    margin-top: -13px;
    margin-left: -13px;
}

.tree_split {
    margin: 0 10px;
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
    color: #f56c6c;
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
