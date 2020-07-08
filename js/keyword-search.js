/**vue项目中列表数据的一般代码
 * 待输入完成再搜索
 */
const data = () => {
    return {
        isAlready: null,
        keyword: '',
        waitForKeywordInputEndTimer: null,
        paging: {
            page: 1,
            limit: 15,
            total: 0
        },
        list: [],
        multipleChosed: []
    }
},
const watch = {
    keyword() {
        const waitTime = 600;
        if (this.waitForKeywordInputEndTimer === null) {
            this.waitForKeywordInputEndTimer = setTimeout(() => {
                this.getList();
            }, waitTime);
        } else {
            clearTimeout(this.waitForKeywordInputEndTimer);
            this.waitForKeywordInputEndTimer = setTimeout(() => {
                this.getList();
            }, waitTime);
        }
    },
    'paging.page'() {
        this.getList();
    },
    'paging.limit'() {
        this.getList();
    },
}
